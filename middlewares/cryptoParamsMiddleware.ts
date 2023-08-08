import "dotenv/config";
import { HttpStatusCode } from "axios";
import { Request, Response, NextFunction } from "express";

import { AES, enc } from "crypto-js";
import { createHttpError } from "../services/httpErrorService";

const { PARAMS_SALT = "" } = process.env;

export function encryptParams(params: object) {
  return AES.encrypt(JSON.stringify(params), PARAMS_SALT).toString();
}

/**
 * Middleware расшифровывает параметры из req.query.data и помещает их в качестве объектов Request Query
 * @param throwError Ошибка при неудаче расшифровки
 */
export function decryptParamsMiddleware(throwError = true) {
  return async function decryptParamsMiddleware(req: Request, res: Response, next: NextFunction) {
    let invalidData: boolean = false;

    if (req.query.data) {
      try {
        const params = AES.decrypt(String(req.query.data), PARAMS_SALT).toString(enc.Utf8);

        req.query = { ...JSON.parse(params) };
        
        delete req.query.data;
      } catch {
        invalidData = true;
      }
    }
    
    if (throwError && invalidData) {
      next(createHttpError(HttpStatusCode.BadRequest, "Invalid data"));
    } else {
      next();
    }
  };
}
