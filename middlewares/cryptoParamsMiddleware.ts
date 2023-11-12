import "dotenv/config";
import { HttpStatusCode } from "axios";
import { Request, Response, NextFunction } from "express";

import { AES, enc } from "crypto-js";
import { createHttpError } from "../services/httpErrorService";

const { PARAMS_SALT = "" } = process.env;

export function encryptParams(params: object) {
  return {
    data: AES.encrypt(JSON.stringify(params), PARAMS_SALT).toString(),
  };
}

/**
*Middleware розшифровує параметри з req.query.data і поміщає їх як об'єкти Request Query
 *@param throwError Помилка при невдачі розшифровки
 *
 *Як результат розшифровки, зашифровані параметри йдуть у Request.query
 */
export function decryptParamsMiddleware(throwError = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = AES.decrypt(String(req.query.data), PARAMS_SALT).toString(enc.Utf8);
      req.query = { ...JSON.parse(params) };
    } catch {
      if (throwError) {
        next(createHttpError(HttpStatusCode.BadRequest, "Invalid data"));
      }
    }
    next();
  };
}
