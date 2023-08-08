import joi, { ValidationError } from "joi";
import { createHttpError } from "./httpErrorService";
import { HttpStatusCode } from "axios";

export const emailSchema = joi.string().email().required();
export const passwordSchema = joi.string().min(6).required();
export const firstNameSchema = joi.string().pattern(/[a-zа-я]{3,20}/i).required();
export const lastNameSchema = joi.string().pattern(/[a-zа-я]{3,20}/i).required();
export const otpSchema = joi.string().pattern(/\d{6}/).required();

class ValidationService {
  public async validateFields(fields: object, schema: joi.ObjectSchema<any>) {
    try {
      await schema.validateAsync(fields, { abortEarly: false });
    } catch (err: ValidationError | any) {
      type FieldError = { field: string; value: string };
      const errors: Array<FieldError> = [];

      if (err instanceof ValidationError) {
        for (const error of err.details) {
          if (error.context && error.context.key) {
            errors.push({
              field: error.context["key"],
              value: error.context["value"] ?? "required",
            });
          }
        }
      }

      throw createHttpError(HttpStatusCode.BadRequest, { success: false, errors });
    }
  }
}

export default new ValidationService();