import { UserRole } from '../../../common/types/enum';
import { IUser } from '../../../models/user.model';

export interface IRegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  branch_id?: string;
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
  user: Partial<IUser>
  tokens: ITokenResponse;
}