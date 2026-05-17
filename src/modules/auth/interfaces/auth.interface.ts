import { ICustomer } from '../../../models/customer.model';

export interface IRegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  registration_channel?: 'app' | 'google' | 'admin';
  avatar_url?: string;
  is_email_verified?: boolean;
}

export interface ILoginData {
  email: string;
  password?: string;
}

export interface ITokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: Partial<ICustomer>;
  tokens: ITokenResponse;
}