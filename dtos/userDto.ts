import { pick } from "lodash";
import { InvoiceAddress, UserAddress } from "../mongodb/models/userModel";

type UserGender = "male" | "female" | "other";

export interface IUserPayload {
  _id: string;
  addressList: { list: UserAddress[], selected: number };
  invoiceAddress: InvoiceAddress;
  orders: any[];
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
    currentPassword?: string;
    newPassword?: string;
    repeatPassword?: string;
  }
};

export default class UserDto {
  private _payload: IUserPayload;

  constructor(user: object) {
    this._payload = pick(user, [
      "_id",
      "addressList",
      "invoiceAddress",
      "orders",
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
