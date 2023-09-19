import joi, { ValidationError } from "joi";
import { createHttpError } from "./httpErrorService";

class ValidationService {
  public async validateField(field: string | object | undefined, schema: joi.AnySchema, name: string) {
    await this.validateFields({ field }, joi.object({ field: schema }), [name]);
  }
  public async validateFields(fields: object, schema: joi.ObjectSchema<any>, customNames?: string[]) {
    try {
      await schema.validateAsync(fields, { abortEarly: false });
    } catch (err) {
      const errors = (err as ValidationError).details?.map((error, index) => {
        const field = customNames?.[index] ?? error.context?.key;
        const value = error.context?.value || 'required';
        // Ручная ошибка Joi .label("Text error...")
        const validLabel = String(error.context?.label) !== "field";
        const label = validLabel && error.context?.label;
                
        return { field, value, label, details: error.message };
      }) || [];
    
      throw createHttpError(400, { success: false, errors });
    }
  }
}

export default new ValidationService();