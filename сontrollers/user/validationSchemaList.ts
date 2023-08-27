import joi from 'joi';

export const emailSchema = joi.string().email().required();
export const passwordSchema = joi.string().min(6).required();
export const firstNameSchema = joi.string().regex(/^[a-zа-яіяєї]{3,20}$/i, "gm").required();
export const lastNameSchema = joi.string().regex(/^[a-zа-яіяєї]{3,20}$/i, "gm").required();
export const otpSchema = joi.string().pattern(/\d{6}/).required();
export const genderSchema = joi.string().valid("male", "female", "other").required();
export const changePasswordSchema = joi.object({
  current: passwordSchema,
  newPassword: passwordSchema.not(joi.ref('current')).label('New password repeats previous'),
  repeatPassword: passwordSchema.valid(joi.ref('newPassword')).label('Repeated password doesnt much the new one')
});

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

export const userProfileSchema = joi.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  gender: genderSchema,
  phoneNumber: joi.string().required(),
  birthDate: joi.date().optional(),
  changePassword: changePasswordSchema.optional()
});