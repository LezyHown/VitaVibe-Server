import { keys, pick } from "lodash";

export interface IUserPayload {
  _id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  activation: {
    isActivated: boolean;
    otpExpiryMs: number;
  };
  accessToken?: string;
}

export default class UserDto {
  private _payload: IUserPayload;

  constructor(user: object) {
    this._payload = pick(user, [
      "_id",
      "personalInfo.email",
      "personalInfo.firstName",
      "personalInfo.lastName",
      "activation.isActivated",
      "activation.otpExpiryMs",
      "accessToken",
    ]) as IUserPayload;
  }

  public getPayload() {
    return this._payload;
  }

  public setAccessToken(token: string) {
    this._payload.accessToken = token;
  }
}
