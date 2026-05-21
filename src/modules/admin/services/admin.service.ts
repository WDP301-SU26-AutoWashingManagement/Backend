import { ConflictError } from '../../../common/utils/AppError';
import { adminRepository } from '../repositories/admin.repository';
import { IAdminResponse, ICreateAdminData } from '../interfaces/admin.interface';

export class AdminService {
	static async createAdmin(data: ICreateAdminData): Promise<IAdminResponse> {
		const existingAdmin = await adminRepository.findOne({ email: data.email });
		if (existingAdmin) {
			throw new ConflictError('Email is already registered');
		}

		const admin = await adminRepository.create({
			...data,
			is_active: data.is_active ?? true,
		});

		return { admin: this.sanitizeAdmin(admin) };
	}

	private static sanitizeAdmin(admin: any) {
		const obj = admin.toObject();
		delete obj.password;
		return obj;
	}
}
export const adminService = new AdminService()
