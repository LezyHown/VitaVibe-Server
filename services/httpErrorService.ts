import { HttpStatusCode } from "axios";
import httpErrors from "http-errors";

export function createHttpError(status: HttpStatusCode, message?: object | string) {
  console.log(status, message);
  return httpErrors(status, { message: message });
}
