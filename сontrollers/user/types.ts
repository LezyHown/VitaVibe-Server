import { ErrorOutputType } from "../../middlewares/tools/anyMiddlewarePassed";

export interface RegistrationBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  subscribe?: boolean;
};

export const SHOW_LAST_ERROR: ErrorOutputType = "LAST"; 