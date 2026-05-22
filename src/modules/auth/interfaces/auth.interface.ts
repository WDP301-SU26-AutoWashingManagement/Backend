import { UserRole } from '@common/types';
import { ICustomer } from '../../../models/customer.model';
import { IAdmin } from 'src/models/admin.model';
export interface IRegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  registration_channel?: 'google' | 'admin';      // Chỗ này cân nhắc lại cái admin, ko thì bỏ lun registration_channel
  avatar_url?: string;
  is_email_verified?: boolean;
}

export interface ILoginData {
  email: string;
  password?: string;
  type?: UserRole; // 'customer' | 'admin' | 'staff' | 'manager'
}

export interface ITokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: Partial<ICustomer> | Partial<IAdmin>;
  tokens: ITokenResponse;
}