import qs from "qs";
import { HttpStatusCode } from "axios";
import { RegistrationBody } from "./types";
import { TypedRequestBody } from "../../routes/types";
import { Request, NextFunction, Response } from "express";
import { createHttpError } from "../../services/httpErrorService";
import { encryptParams } from "../../middlewares/cryptoParamsMiddleware";

import validationService from "../../services/validationService";
import { isValidPhoneNumber } from "libphonenumber-js";
import {
  changePasswordSchema,
  emailSchema,
  otpSchema,
  passwordSchema,
  userLoginSchema,
  userProfileSchema,
  userRegistrationSchema,
} from "./validationSchemaList";

import UserDto, { IUserPayload, UserProfileData } from "../../dtos/userDto";
import tokenService from "../../services/tokenService";
import mailService from "../../services/mailService";
import userService from "../../services/userService";

class UserController {
  async registration(req: TypedRequestBody<RegistrationBody>, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, subscribe = false } = req.body;
      await validationService.validateFields(
        { email, password, firstName, lastName },
        userRegistrationSchema
      );

      const user = await userService.createNewAccount({ email, password, firstName, lastName }, subscribe);
      const userDto = new UserDto(user.toObject());
      const payload = userDto.getPayload();
      const tokenSet = tokenService.generateTokenSet(res, payload);

      mailService.autoSendVerify(tokenSet.access);
      userDto.setAccessToken(tokenSet.access);
      await tokenService.saveToken(user.id, tokenSet.refresh);

      res.status(200).send({ payload });
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }

  async login(req: TypedRequestBody<{ email: string; password: string }>, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      await validationService.validateFields({ email, password }, userLoginSchema);

      const payload = await userService.login({ email, password }, res);

      res.status(200).send({
        payload,
        message: "success login!",
      });
    } catch (e) {
      next(e);
    } finally {
      next();
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { REFRESH_TOKEN } = req.cookies;
      const payload = await userService.logout(REFRESH_TOKEN, res);

      res.status(200).send({ payload, message: "success logout" });
    } catch (e) {
      next(e);
    } finally {
      next();
    }
  }

  async sendOtp(req: TypedRequestBody<{ payload: IUserPayload }>, res: Response, next: NextFunction) {
    try {
      const { payload } = req.body;

      if (payload) {
        const otpSendResult = await userService.sendOtp(payload);

        res.status(otpSendResult.statusCode).send(otpSendResult);
      } else {
        throw createHttpError(HttpStatusCode.Unauthorized);
      }
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = (req.query.payload ?? req.body.payload) as IUserPayload;
      const otp = req.params.otp;

      await validationService.validateField(otp, otpSchema, "otp");

      const activationResult = await userService.activate(payload, otp);

      res.status(activationResult.statusCode).send(activationResult);
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { payload } = req.body as { payload: IUserPayload };
      const { REFRESH_TOKEN } = req.cookies;

      const newPayload = await userService.refresh(payload, REFRESH_TOKEN, res);

      res.status(200).send({ message: "success refresh", payload: newPayload });
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }

  async actualPayload(req: TypedRequestBody<{ payload: IUserPayload }>, res: Response, next: NextFunction) {
    try {
      const oldPayload = req.body.payload;
      const payload = await userService.actualPayload(oldPayload);

      res.status(200).send({ payload });
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }

  async sendRecovery(req: TypedRequestBody<{ email: string }>, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      await validationService.validateField(email, emailSchema, "email");
      await userService.sendRecovery(email);

      res.status(200).send({ message: "If mail exists we sent a recovery link, check out your mail" });
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }

  async acceptRecovery(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessToken, prevPassword, timeout } = req.query;

      userService.validateRecoveryTimeout(timeout as string);

      const encryptedPassword = qs.stringify(encryptParams({ prevPassword }));
      const clientRecoveryLink = `${process.env.CLIENT_URL}/account/changeforgotten/${accessToken}?${encryptedPassword}`;

      res.redirect(clientRecoveryLink);
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }

  async resetPassword(
    req: TypedRequestBody<{ payload: IUserPayload; password: string }>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { payload, password } = req.body;
      await validationService.validateField(password, passwordSchema, "password");

      const newPayload = await userService.resetPassword(payload, password, res);
      res.status(200).send({
        payload: newPayload,
        message: "You success reset the password",
      });
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }

  async updateProfile(
    req: TypedRequestBody<{ payload: IUserPayload; profile: UserProfileData }>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { payload, profile } = req.body;
      const { changePassword, phoneNumber } = profile;
      const isChangePassword =
        Boolean(changePassword) &&
        (await validationService
          .validateField(changePassword, changePasswordSchema.required(), "isChangePassword")
          .then(() => true)
          .catch(() => false));

      await validationService.validateFields(profile, userProfileSchema);

      if (!isValidPhoneNumber(phoneNumber as string)) {
        throw createHttpError(400, "Phone number invalid");
      }

      const newPayload = await userService.updateProfile(payload, req.body.profile, isChangePassword);

      res.status(200).send({ payload: newPayload });
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }
}

export default new UserController();
