import { Schema, Types, model } from "mongoose";

const personalInfoSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    birthDate: { type: Date, default: null },
    phoneNumber: { type: String, default: null },
  },
  { _id: false }
);

const activationSchema = new Schema(
  {
    isActivated: { type: Boolean, required: true, default: false },
    otpExpiryMs: { type: Number, required: true, default: 0 },
    secret: {
      key: { type: String, required: true },
      settings: { type: Object, required: true },
    },
  },
  { _id: false }
);

export enum InvoiceDeliveryEnum {
  electronic = "electronic",
  paper = "paper",
}

export interface UserAddress {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  street: string;
  city: string;
  homeNumber: string;
  postCode: string;
  additionalInfo?: string; // Доп. информация
}

export interface InvoiceAddress extends Omit<UserAddress, "additionalInfo"> {
  invoiceDelivery: InvoiceDeliveryEnum;
}

const addressListLimiter = (list: UserAddress[]) => list.length <= 20;

const AddressListSchema = new Schema(
  {
    list: {
      type: [
        {
          _id: false,
          firstName: { type: String, required: true },
          lastName: { type: String, required: true },
          phoneNumber: { type: String, required: true },
          street: { type: String, required: true },
          city: { type: String, required: true },
          homeNumber: { type: String, required: true },
          postCode: { type: String, required: true },
          additionalInfo: { type: String, default: "" },
        },
      ],
      default: [],
      validate: [addressListLimiter, "Список не должен превышать 20 адрессов"],
    },
    selected: { type: Number, default: 0 },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    personalInfo: { type: personalInfoSchema, required: true },
    addressList: {
      type: AddressListSchema,
      required: true,
    },
    invoiceAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      homeNumber: { type: String, required: true },
      postCode: { type: String, required: true },
      invoiceDelivery: { type: String, enum: InvoiceDeliveryEnum, default: InvoiceDeliveryEnum.electronic },
    },
    orders: [{ type: Types.ObjectId, ref: "Order" }],
    newsSubscriber: { type: Types.ObjectId, ref: "NewsSubscriber", required: false, default: null },
    activation: { type: activationSchema, required: true },
  },
  { versionKey: false }
);

export default model("User", userSchema);
