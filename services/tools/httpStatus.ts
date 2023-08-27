import { HttpStatusCode } from "axios";

export interface HttpStatus {
  message: string;
  statusCode: HttpStatusCode;
};

export interface SendOtpResult extends HttpStatus {
  reachedTime?: number;
};