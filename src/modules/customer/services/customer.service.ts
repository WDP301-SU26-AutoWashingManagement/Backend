import { customerRoleRepository } from "@modules/userProfile/repositories/userProfile.repository";

export class CustomerService {
    private readonly customerRepo = customerRoleRepository;

    async updateTier(customer_id: string, tier: string) {
        await this.customerRepo.updateById(customer_id, { tier_id: tier });
    }   
}

export const customerService = new CustomerService(); 