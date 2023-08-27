import { Response } from "express";
import speakeasy from "speakeasy";
import { compare, hash } from "bcrypt";
import { createHttpError } from "./httpErrorService";
import axios, { HttpStatusCode } from "axios";
import "dotenv/config";

import userModel from "../mongodb/models/userModel";
import newsSubscriber from "../mongodb/models/newsSubscriberModel";
import UserDto, { IUserPayload, UserProfileData } from "../dtos/userDto";
import tokenService from "./tokenService";
import mailService from "./mailService";

import { maskEmail } from "./tools/maskData";
import { HttpStatus, SendOtpResult } from "./tools/httpStatus";

interface ICredentials {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
}

class UserService {
  public async createNewAccount(credentials: ICredentials, newsSubscription: boolean) {
    const { email, password, firstName, lastName } = credentials;

    const foundedUser = await userModel.findOne({ "personalInfo.email": email });
    if (foundedUser) {
      throw createHttpError(400, "Email has been used before");
    }

    const encryptedPassword = await hash(password, 8);
    const secret = speakeasy.generateSecret();
    const otpSettings = {
      encoding: "base32",
      step: 8 * 60, // OTP работает до ~ 5 минут
    };

    console.log(`[${new Date().toISOString()}] Generated secret for user ${email}: ${secret.base32}`);

    const user = await userModel.create({
      personalInfo: { email, password: encryptedPassword, firstName, lastName },
      activation: {
        secret: {
          key: secret.base32,
          settings: otpSettings,
        },
      },
    });

    if (newsSubscription) {
      const subscriber = await newsSubscriber.create({ email: user.personalInfo.email });
      user.newsSubscriber = subscriber.id;
      await user.save();
    }

    return user;
  }

  public async login(
    credentials: Omit<ICredentials, "firstName" | "lastName">,
    res: Response
  ): Promise<IUserPayload> {
    const user = await userModel.findOne({ "personalInfo.email": credentials.email });
    const error = createHttpError(HttpStatusCode.Unauthorized, "Invalid credentials");
    const isSuccessLogin = await compare(credentials.password, String(user?.personalInfo.password));

    if (!user || !isSuccessLogin) {
      throw error;
    }

    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokenSet(res, userDto.getPayload());

    await tokenService.saveToken(user.id, tokens.refresh);
    userDto.setAccessToken(tokens.access);

    return userDto.getPayload();
  }

  public async logout(refreshToken: string, res: Response): Promise<IUserPayload> {
    const payload = tokenService.validateToken(refreshToken, "JWT_REFRESH_SECRET");

    if (!payload) {
      throw createHttpError(HttpStatusCode.Unauthorized, "must be authorized in system");
    }

    await tokenService.removeRefreshToken(refreshToken, res);

    return payload;
  }

  public async sendOtp(payload: IUserPayload): Promise<SendOtpResult> {
    const user = await userModel.findById(payload._id);

    if (!user) {
      throw createHttpError(HttpStatusCode.Unauthorized, "no user provided");
    }

    const { otpExpiryMs } = user.activation;
    const actualDate = new Date();

    if (actualDate.getTime() >= otpExpiryMs) {
      const otp = speakeasy.totp({
        secret: user.activation.secret?.key,
        ...user.activation.secret?.settings,
      });

      console.log(
        actualDate.toISOString(),
        `new OTP code "${otp}" was generated for email "${payload.personalInfo.email}"`
      );

      mailService.sendVerify(payload, otp);

      actualDate.setMinutes(actualDate.getMinutes() + 1);
      user.activation.otpExpiryMs = actualDate.getTime();
      await user?.save();

      return { statusCode: 200, message: "otp was success sent" };
    } else {
      const reachedTime = otpExpiryMs - actualDate.getTime();

      return { statusCode: 403, message: "please, wait some time", reachedTime };
    }
  }

  public async activate(payload: IUserPayload, otp: string): Promise<HttpStatus> {
    const user = await userModel.findOne({ "personalInfo.email": payload?.personalInfo.email });
    const maskedEmail = maskEmail(payload?.personalInfo.email);

    if (!user) {
      return {
        message: "this link unsupport for this user anymore",
        statusCode: HttpStatusCode.BadRequest,
      };
    } else if (user.activation.isActivated) {
      return {
        message: `account ${maskedEmail} already activated`,
        statusCode: HttpStatusCode.Conflict,
      };
    }

    const serverTime = new Date().toISOString();
    const secretOtp = String(user.activation.secret?.key);
    const settings = user.activation.secret?.settings;

    const verifiedCodes = [
      // OTP с ограничением исходя из настроек в бд
      speakeasy.totp.verify({
        secret: secretOtp,
        token: otp,
        ...settings,
      }),
      // OTP с ограничением менее 30 секунд
      speakeasy.totp.verify({ secret: secretOtp, token: otp }),
    ];
    const activationSuccess = verifiedCodes.some((code) => code === true);

    if (!activationSuccess) {
      console.log(`[${serverTime}] Invalid OTP ${otp} accepted from user ${payload.personalInfo.email}`);

      return { message: "invalid otp", statusCode: HttpStatusCode.BadRequest };
    }

    user.activation.isActivated = true;
    await user.save();

    console.log(
      `[${serverTime}] OTP ${otp} was accepted for the user ${payload.personalInfo.email} successfully`
    );

    return {
      statusCode: 200,
      message: `successfully activated with email: ${maskedEmail}!`,
    };
  }

  public async refresh(payload: IUserPayload, refreshToken: string, res: Response): Promise<IUserPayload> {
    const actualUser = (await userModel.findById(payload._id))?.toObject() as object;
    const user = new UserDto(actualUser);
    await tokenService.removeRefreshToken(refreshToken, res);

    const tokens = tokenService.generateTokenSet(res, payload);
    await tokenService.saveToken(payload._id, tokens.refresh);
    user.setAccessToken(tokens.access);

    return user.getPayload();
  }

  public async actualPayload(oldPayload: IUserPayload): Promise<IUserPayload> {
    const user = await userModel.findById(oldPayload._id);

    if (!user) {
      throw createHttpError(500);
    }
    const userDto = new UserDto(user.toObject());
    userDto.setAccessToken(oldPayload.accessToken ?? "");

    return userDto.getPayload();
  }

  public async sendRecovery(email: string) {
    const user = await userModel.findOne({ "personalInfo.email": email });

    if (user) {
      const payload = new UserDto(user).getPayload();
      const recoveryAccessToken = tokenService.generateAccessToken(payload, "10m");
      mailService.sendRecovery(payload.personalInfo.email, recoveryAccessToken, user.personalInfo.password);
    }
  }

  public validateRecoveryTimeout(timeout: string) {
    const error = createHttpError(HttpStatusCode.Gone, "the link is no longer available for recovery");
    if (!timeout) {
      throw error;
    }
    const [currentDate, timeoutDate] = [new Date(), new Date(timeout)];
    const timeIsOver = currentDate > timeoutDate;

    if (timeIsOver) {
      throw error;
    }
  }

  public async resetPassword(payload: IUserPayload, password: string, res: Response) {
    const user = await userModel.findById(payload._id);

    if (!user) {
      throw createHttpError(HttpStatusCode.NotFound, "user not found");
    }

    user.personalInfo.password = await hash(password, 8);
    await user.save();
    const userDto = new UserDto(user);
    const tokenSet = tokenService.generateTokenSet(res, userDto.getPayload());
    userDto.setAccessToken(tokenSet.access);

    return userDto.getPayload();
  }

  public async updateProfile(
    payload: IUserPayload,
    profile: UserProfileData,
    isChangePassword: boolean
  ): Promise<IUserPayload> {
    const user = await userModel.findById(payload._id);

    if (user) {
      const { personalInfo } = user?.toObject();

      // Изменение данных пользователя на новые
      user.personalInfo = Object.assign(personalInfo, profile);
      await user.save();

      if (isChangePassword) {
        const newPayload = await axios
          .post(
            process.env.API_URL + "/api/user/reset/password",
            {
              prevPassword: profile.changePassword?.current,
              password: profile.changePassword?.newPassword,
            },
            {
              headers: { Authorization: "Bearer " + payload.accessToken },
            }
          )
          .then(({ data }: { data: { payload: IUserPayload } }) => data.payload)
          .catch(({ response }) => {
            throw createHttpError(400, response.data.message);
          });

        return newPayload;
      } else {
        const userDto = new UserDto(user.toObject());
        userDto.setAccessToken(payload.accessToken as string);

        return userDto.getPayload();
      }
    } else {
      throw createHttpError(500);
    }
  }
}

export default new UserService();
