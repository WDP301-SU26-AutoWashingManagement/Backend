import { UserRole } from '../../../common/types/enum';
import { IUser } from 'src/models/user.model';

export interface IRegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
}

export interface IRoleData {
  
}

export interface ILoginData {
  email: string;
  password?: string;
  role?: UserRole; // 'customer' | 'admin' | 'staff'
}

export interface ITokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: Partial<IUser>
  tokens: ITokenResponse;
}