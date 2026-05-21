import { NotFoundError, BadRequestError } from '../../../common/utils/AppError';
import { customerRepository } from '../repositories/customer.repository';
import { IUpdateProfileData, IChangePasswordData } from '../interfaces/customer.interface';

export class CustomerService {
    static async getProfile(customerId: string) {
        const customer = await customerRepository.findById(customerId);
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }
        return this.sanitizeCustomer(customer);
    }

    static async updateProfile(customerId: string, data: IUpdateProfileData) {
        const customer = await customerRepository.findById(customerId);
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        // Add additional checks here if needed, for instance, checking phone uniqueness if phone is updated
        if (data.phone && data.phone !== customer.phone) {
            const existingPhone = await customerRepository.findOne({ phone: data.phone });
            if (existingPhone) {
                throw new BadRequestError('Phone number is already in use');
            }
        }

        if (data.identity_number && data.identity_number !== customer.identity_number) {
            const existingIdentity = await customerRepository.findOne({ identity_number: data.identity_number });
            if (existingIdentity) {
                throw new BadRequestError('Identity number is already in use');
            }
        }

        const updatedCustomer = await customerRepository.updateById(customerId, data);
        return this.sanitizeCustomer(updatedCustomer);
    }

    static async changePassword(customerId: string, data: IChangePasswordData) {
        // Need to explicitly select password
        const customer = await customerRepository.findByIdWithPassword(customerId);
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        const isMatch = await customer.comparePassword(data.old_password);
        if (!isMatch) {
            throw new BadRequestError('Incorrect old password');
        }

        customer.password = data.new_password;
        await customer.save();

        return { message: 'Password changed successfully' };
    }

    private static sanitizeCustomer(customer: any) {
        const { password, ...safeCustomer } = typeof customer.toObject === 'function' ? customer.toObject() : customer;
        return safeCustomer;
    }
}
export const adminService = new CustomerService()
