import joi from 'joi';

import {
  emailSchema,
  firstNameSchema,
  lastNameSchema,
  otpSchema,
  passwordSchema,
} from "../../services/validationService";

export const userRegistrationSchema = joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
});

export const userLoginSchema = joi.object({
  email: emailSchema,
  password: passwordSchema,
});

export const userActivateSchema = joi.object({
  email: emailSchema,
  otp: otpSchema,
});