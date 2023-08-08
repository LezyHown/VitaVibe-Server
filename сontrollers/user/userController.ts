import { Request, NextFunction, Response } from "express";
import { HttpStatusCode } from "axios";

import { TypedRequestBody } from "../../routes/types";
import { RegistrationBody } from "./types";
import UserDto, { IUserPayload } from "../../dtos/userDto";
import { userActivateSchema, userLoginSchema, userRegistrationSchema } from "./userValidationSchemas";

import userService, { ActivationResult } from "../../services/userService";
import validationService from "../../services/validationService";
import tokenService from "../../services/tokenService";
import mailService from "../../services/mailService";
import { createHttpError } from "../../services/httpErrorService";

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
      const tokenSet = tokenService.generateTokenSet(res, userDto.getPayload());

      mailService.autoSendVerify(userDto.getPayload());
      userDto.setAccessToken(tokenSet.access);
      await tokenService.saveToken(user.id, tokenSet.refresh);

      res.status(200).send({ payload: userDto.getPayload() });
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
        res.status(200).send(otpSendResult);
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
      
      await validationService.validateFields({ email: payload?.personalInfo.email, otp }, userActivateSchema);

      const activationResult: ActivationResult = await userService.activate(payload, otp); 

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
}

export default new UserController();