import { HttpStatusCode } from "axios";
import { NextFunction, Request, Response } from "express";
import { createHttpError } from "../services/httpErrorService";
import tokenService from "../services/user/tokenService";

type TokenType = "ACCESS_TOKEN" | "REFRESH_TOKEN";

function getAuthorizationAccess(authorization: string | undefined): string | null {
  const [method, value] = String(authorization).split(" ");

  return method === "Bearer" ? value : null;
}

/**
 * Получает данные из токена и передает в Body, как поле payload.
 * - Любой токен может быть устаревшим.
 * - Рекомендуется делать обновление с клиента.
 *  @param tokenType Тип токена
 *  @param skipError Пропуск к следующему middleware при ошибке
 *  @param activationRequired наличие активации на аккаунте обязательно
 */
export function tokenMiddleware(tokenType: TokenType, skipError?: boolean, activationRequired?: boolean) {
  return async function payloadToBody(req: Request, res: Response, next: NextFunction) {
    const { REFRESH_TOKEN } = req.cookies;
    const isAccessTokenType = tokenType === "ACCESS_TOKEN";
    const token = isAccessTokenType ? getAuthorizationAccess(req.headers.authorization) : REFRESH_TOKEN;
    const secretKey = isAccessTokenType ? "JWT_ACCESS_SECRET" : "JWT_REFRESH_SECRET";

    const payload = tokenService.validateToken(token, secretKey);

    if (!payload && !skipError) {
      next(createHttpError(HttpStatusCode.Unauthorized, `Invalid ${tokenType.toLocaleLowerCase()}`));
      return;
    }
    
    req.body = { ...req.body, payload };

    if (payload && isAccessTokenType) {
      payload.accessToken = token;
      
      if (activationRequired && !payload.activation.isActivated) {
        next(createHttpError(HttpStatusCode.Forbidden, "Your account is not activated"));
        return;
      }
    }

    next();
  };
}