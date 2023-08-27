export interface RegistrationBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  subscribe?: boolean;
};