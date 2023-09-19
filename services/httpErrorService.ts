import { HttpStatusCode } from "axios";
import httpErrors from "http-errors";

export function createHttpError(status: HttpStatusCode, message?: object | string) {
  return httpErrors(status, { message: message });
}
