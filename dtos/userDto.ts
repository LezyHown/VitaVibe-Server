import { pick } from "lodash";

type UserGender = "male" | "female" | "other";

export interface IUserPayload {
  _id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    gender: UserGender;
    phoneNumber?: string;
    birthDate?: Date;
  };
  activation: {
    isActivated: boolean;
  };
  accessToken?: string;
}

export type UserProfileData = IUserPayload["personalInfo"] & {
  changePassword?: {
    current?: string;
    newPassword?: string;
    repeatPassword?: string;
  }
};

export default class UserDto {
  private _payload: IUserPayload;

  constructor(user: object) {
    this._payload = pick(user, [
      "_id",
      "personalInfo.email",
      "personalInfo.firstName",
      "personalInfo.lastName",
      "personalInfo.birthDate",
      "personalInfo.phoneNumber",
      "personalInfo.gender",
      "activation.isActivated",
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
