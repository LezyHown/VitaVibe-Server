import joi from 'joi';
import { Request, Response, NextFunction } from "express";
import { createHttpError } from "../../services/httpErrorService";
import { emailSchema } from "../user/userValidation";
import { TypedRequestBody } from "../types";
import { HttpStatusCode } from "axios";

import promoService from "../../services/promo/promoService";
import validationService from "../../services/validationService";
import mailService from "../../services/mail/mailService";
import newsSubscriberModel from "../../mongodb/models/newsSubscriberModel";
import promoCodeModel from "../../mongodb/models/promoCodeModel";

class PromocodeController {
  public async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.query as { email: string };
      await validationService.validateField(email, emailSchema, "email");

      const { percentDiscount, code, endDate } = await promoService.createPromoCode(email);
      mailService.sendPromocode(email, code, percentDiscount, endDate);

      res.status(200).redirect(process.env.CLIENT_URL + "/subscribed");
    } catch (error) {
      next(error);
    } finally {
      next();
    }
  }
  public async inviteRequest(req: TypedRequestBody<{ email: string }>, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await validationService.validateField(email, emailSchema, "email");

      if (await newsSubscriberModel.findOne({ email }) && await promoCodeModel.findOne({ email })) {
        throw createHttpError(
          HttpStatusCode.Conflict,
          "Підписка на новини за адресою " + email + " вже існує."
        );
      }

      mailService.sendPromocodeInvite(email, Number(process.env.SUBSCRIPTION_PERCENT_DISCOUNT));
      res.status(200).send({ message: "Надіслане запрошення на розсилку " + email });
    } catch (error) {
      next(error);
    } finally {
      next();
    }
  }
  public async testCode(req: TypedRequestBody<{ code: string }>, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      await validationService.validateField(code, joi.string().required(), "code");

      const result = await promoService.testPromoCode(code);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    } finally {
      next();
    }
  }
}

export default new PromocodeController();
