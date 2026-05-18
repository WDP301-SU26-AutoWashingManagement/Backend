import { IAdmin } from '../../../models/admin.model';

export interface ICreateAdminData {
	email: string;
	password: string;
	full_name: string;
	avatar_url?: string;
	is_active?: boolean;
}

export interface IAdminResponse {
	admin: Partial<IAdmin>;
}

