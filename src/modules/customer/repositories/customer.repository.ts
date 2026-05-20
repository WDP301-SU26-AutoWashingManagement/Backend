import Customer, { ICustomer } from '../../../models/customer.model';
import { ITierConfig } from '../../../models/tierConfig.model';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { MongoId } from '../../../common/types';

// Shape trả về sau khi populate tier_id
export interface ICustomerWithTier extends Omit<ICustomer, 'tier_id'> {
    tier_id: ITierConfig | null;
}

export class CustomerRepository extends BaseRepository<ICustomer> {
    constructor() {
        super(Customer);
    }

    /**
     * Lấy booking_window_days từ TierConfig của customer.
     * Trả về số ngày được đặt trước tối đa, hoặc null nếu chưa có tier.
     */
    async findBookingWindowByCustomerId(customerId: MongoId): Promise<number | null> {
        const result = await this.model
            .findById(customerId)
            .select('tier_id')
            .populate<{ tier_id: ITierConfig | null }>({
                path:   'tier_id',
                select: 'booking_window_days',
            })
            .lean<ICustomerWithTier>()
            .exec();

        return result?.tier_id?.booking_window_days ?? null;
    }
}

export const customerRepository = new CustomerRepository(); // Singleton instance