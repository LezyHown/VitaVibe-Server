import { createHttpError } from "../services/httpErrorService";
import validationService from "../services/validationService";
import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";

import { passwordSchema } from "../сontrollers/user/validationSchemaList";

import userModel from "../mongodb/models/userModel";
import { IUserPayload } from "../dtos/userDto";

type Query = { prevPassword: string | undefined };

function isQueryPasswordConverge(password: string, query: Query) {
  const { prevPassword } = query;
  return Boolean(prevPassword && password === prevPassword);
}

export default async function recoveryMiddleware(req: Request, res: Response, next: NextFunction) {
  const { payload, prevPassword } = req.body as { payload: IUserPayload; prevPassword: string };
  const user = await userModel.findById(payload._id);

  if (!user) {
    next(createHttpError(500));
    return;
  }

  const { password } = user.personalInfo;

  try {
    if (isQueryPasswordConverge(password, req.query as Query)) {
      return;
    } else if (prevPassword) {
      // Валидация прошлого пароля от пользователя схемой
      await validationService.validateField(prevPassword, passwordSchema, "prevPassword");
      // Проверка на сходство с пользовательским паролем
      const compareResult = await bcrypt.compare(prevPassword, password);
      
      if (!compareResult) {
        throw createHttpError(400, "Password mismatch");
      }
    } else {
      throw createHttpError(400);
    }
  } catch (err) {
    next(err);
  } finally {
    next();
  }
}
