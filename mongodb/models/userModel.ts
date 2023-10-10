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

export const AddressSchema = new Schema<UserAddress>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  homeNumber: { type: String, required: true },
  postCode: { type: String, required: true },
  additionalInfo: { type: String, default: "" }
}, { _id: false });

const AddressListSchema = new Schema(
  {
    list: {
      type: [AddressSchema],
      default: [],
      validate: [addressListLimiter, "Список не должен превышать 20 адрессов"],
    },
    selected: { type: Number, default: 0 },
  },
  { _id: false }
);

export const InvoiceAddressSchema = new Schema({
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  street: { type: String, default: "" },
  city: { type: String, default: "" },
  homeNumber: { type: String, default: "" },
  postCode: { type: String, default: "" },
  invoiceDelivery: { type: String, enum: InvoiceDeliveryEnum, default: InvoiceDeliveryEnum.electronic },
}, { _id: false });

const userSchema = new Schema(
  {
    personalInfo: { type: personalInfoSchema, required: true },
    addressList: {
      type: AddressListSchema,
      default: {
        list: []
      }
    },
    invoiceAddress: InvoiceAddressSchema,
    orders: { type: [Types.ObjectId], default: [], ref: "Order" },
    newsSubscriber: { type: Types.ObjectId, ref: "NewsSubscriber", required: false, default: null },
    activation: { type: activationSchema, required: true },
  },
  { versionKey: false }
);

export default model("User", userSchema);
