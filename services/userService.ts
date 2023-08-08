import { Response } from "express";
import speakeasy from "speakeasy";
import { compare, hash } from "bcrypt";
import userModel from "../mongodb/models/userModel";
import newsSubscriber from "../mongodb/models/newsSubscriberModel";
import { createHttpError } from "./httpErrorService";
import { HttpStatusCode } from "axios";
import UserDto, { IUserPayload } from "../dtos/userDto";
import tokenService from "./tokenService";
import mailService from "./mailService";
import { maskEmail } from "./tools/maskData";

interface ICredentials {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
}

export type SendOtpResult = {
  success: boolean;
  message: string;
  reachedTime?: number;
};

export type ActivationResult = {
  statusCode: HttpStatusCode;
  success: boolean;
  message: string;
};

class UserService {
  public async createNewAccount(credentials: ICredentials, newsSubscription: boolean) {
    const { email, password, firstName, lastName } = credentials;

    const foundedUser = await userModel.findOne({ "personalInfo.email": email });
    if (foundedUser) {
      throw createHttpError(400, "email has been used before");
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
    const error = createHttpError(HttpStatusCode.Unauthorized, "Invalid login credentials");

    const isSuccessLogin = await compare(credentials.password, String(user?.personalInfo.password));

    if (!user || !isSuccessLogin) {
      throw error;
    }

    const userDto = new UserDto(user);
    await tokenService.removeRefreshToken(user.id, res);
    
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

    await tokenService.removeRefreshToken(payload._id, res);

    return payload;
  }

  public async sendOtp(payload: IUserPayload): Promise<SendOtpResult> {
    const user = await userModel.findById(payload._id);

    if (!user) {
      throw createHttpError(HttpStatusCode.InternalServerError);
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

      return { success: true, message: "otp was success sent" };
    } else {
      const reachedTime = otpExpiryMs - actualDate.getTime();

      return { success: false, message: "please, wait some time", reachedTime };
    }
  }

  public async activate(payload: IUserPayload, otp: string): Promise<ActivationResult> {
    const user = await userModel.findOne({ "personalInfo.email": payload.personalInfo.email });
    const maskedEmail = maskEmail(payload.personalInfo.email);

    if (!user) {
      return {
        message: "this link unsupport for this user anymore",
        success: false,
        statusCode: HttpStatusCode.BadRequest,
      };
    } else if (user.activation.isActivated) {
      return {
        message: `account ${maskedEmail} already activated`,
        success: false,
        statusCode: HttpStatusCode.Conflict,
      };
    }

    const serverTime = new Date().toISOString();
    const secretOtp = String(user.activation.secret?.key);
    const settings = user.activation.secret?.settings;

    const verifiedCodes = [
      // OTP с ограничением более 4 минут
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
      console.log(
        `[${serverTime}] Invalid OTP code, accepted from user ${payload.personalInfo.email}: ${otp}`
      );

      return { message: "invalid otp", statusCode: HttpStatusCode.BadRequest, success: false };
    }

    user.activation.isActivated = true;
    await user.save();

    console.log(
      `[${serverTime}] The valid OTP code was accepted for the user ${payload.personalInfo.email}: ${otp}`
    );

    return {
      statusCode: 200,
      message: `successfully activated with email: ${maskedEmail}!`,
      success: true,
    };
  }

  public async refresh(payload: IUserPayload, refreshToken: string, res: Response): Promise<IUserPayload> {
    const actualUser = (await userModel.findById(payload._id))?.toObject() as object;
    const user = new UserDto(actualUser);
    const tokens = tokenService.generateTokenSet(res, payload);
    
    await tokenService.saveToken(payload._id, tokens.refresh);
    user.setAccessToken(tokens.access);

    return user.getPayload(); 
  }
}

export default new UserService();