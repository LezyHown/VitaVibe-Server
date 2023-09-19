import joi from "joi";

export const productGenderSchema = joi.valid("male", "female", "all", null).optional();
export const productQuerySchema = joi.string().min(3).optional();