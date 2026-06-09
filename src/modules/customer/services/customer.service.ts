import { customerRepository } from '../repositories/customer.repository';
import { userRepository } from '@modules/userProfile/repositories/userProfile.repository';
import { TierConfig } from '../../../models/tierConfig.model';
import { Customer, ICustomer } from '../../../models/customer.model';
import { TierClass, UserRole } from '@common/types/enum';
import { ConflictError, NotFoundError } from '../../../common/utils/AppError';
import { ICreateCustomer, IGetCustomerList, IMembershipPoint, IUpdateCustomer } from '../interfaces/customer.interface';
import { FilterQuery, PaginateOptions, PaginateResult, Types } from 'mongoose';
import { generateReferralCode } from '../../../models/global/model.generate';
import { generateCode } from '../../../models/counter.model';
import { tierService } from '@modules/tier/services/tier.service';
import { TierStatus } from '@modules/tier/interfaces/tier.interface';

export class CustomerService {
    private readonly customerRepo = customerRepository;
    private readonly tierService = tierService;

    async createCustomer(dto: ICreateCustomer) {
        // 1. Check if email or phone is already taken
        const existingEmail = await userRepository.findOne({ email: dto.email.toLowerCase().trim() });
        if (existingEmail) {
            throw new ConflictError('Email already taken');
        }

        if (dto.phone) {
            const existingPhone = await userRepository.findOne({ phone: dto.phone.trim() });
            if (existingPhone) {
                throw new ConflictError('Phone number already taken');
            }
        }

        // 2. Determine tier
        let tierId = dto.tier_id;
        if (!tierId) {
            const defaultTier = await TierConfig.findOne({ tier_name: TierClass.MEMBER });
            if (!defaultTier) {
                throw new NotFoundError('Default tier (MEMBER) not found');
            }
            tierId = defaultTier._id.toString();
        } else {
            const tierExists = await TierConfig.findById(tierId);
            if (!tierExists) {
                throw new NotFoundError('Tier not found');
            }
        }

        // 3. Create User doc
        const userCode = await generateCode("user_code", "US", 6);
        const password = dto.password || Math.random().toString(36).substring(2, 10);
        const user = await userRepository.create({
            email: dto.email.toLowerCase().trim(),
            phone: dto.phone?.trim(),
            password,
            role: UserRole.CUSTOMER,
            full_name: dto.full_name.trim(),
            avatar_url: dto.avatar_url,
            branch_id: null,
            user_code: userCode,
            is_active: true,
            is_phone_verified: false,
        });

        // 4. Create Customer doc
        const referralCode = dto.referral_code || generateReferralCode();

        // Check if referral code is unique
        if (dto.referral_code) {
            const referralExists = await customerRepository.findOne({ referral_code: dto.referral_code });
            if (referralExists) {
                throw new ConflictError('Referral code already exists');
            }
        }

        const customer = await customerRepository.create({
            user_id: user._id,
            tier_id: new Types.ObjectId(tierId),
            referral_code: referralCode,
            membership_points: dto.membership_points ?? 0,
            reward_points: dto.reward_points ?? 0,
        });

        const populatedCustomer = await Customer
            .findById(customer._id)
            .populate('user_id')
            .populate('tier_id')
            .exec();

        return populatedCustomer;
    }

    async getCustomerList(dto: IGetCustomerList): Promise<PaginateResult<ICustomer>> {
        const { page = 1, limit = 10, search, tier_id, is_active } = dto;
        const filter: FilterQuery<ICustomer> = {};

        // Filter by tier_id
        if (tier_id) {
            filter.tier_id = new Types.ObjectId(tier_id);
        }

        // Search or is_active filter requires matching Users
        const userFilter: any = { role: UserRole.CUSTOMER };
        let hasUserFilter = false;

        if (search) {
            hasUserFilter = true;
            userFilter.$or = [
                { full_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        if (is_active !== undefined) {
            hasUserFilter = true;
            userFilter.is_active = is_active;
        }

        if (hasUserFilter) {
            const matchedUsers = await userRepository.findMany(userFilter);
            const matchedUserIds = matchedUsers.map(u => u._id);

            if (search) {
                filter.$or = [
                    { user_id: { $in: matchedUserIds } },
                    { customer_code: { $regex: search, $options: 'i' } },
                    { referral_code: { $regex: search, $options: 'i' } }
                ];
            } else {
                filter.user_id = { $in: matchedUserIds };
            }
        }

        const options: PaginateOptions = {
            page,
            limit,
            populate: [
                { path: 'user_id' },
                { path: 'tier_id' }
            ],
            sort: { created_at: -1 }
        };

        return customerRepository.paginate(filter, options);
    }

    async getCustomerById(id: string) {
        const customer = await Customer
            .findById(id)
            .populate('user_id')
            .populate('tier_id')
            .exec();

        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        return customer;
    }

    async updateCustomer(id: string, dto: IUpdateCustomer) {
        const customer = await customerRepository.findById(id);
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        // Update user fields
        const hasUserUpdates =
            dto.email !== undefined ||
            dto.phone !== undefined ||
            dto.password !== undefined ||
            dto.full_name !== undefined ||
            dto.avatar_url !== undefined ||
            dto.is_active !== undefined;

        if (hasUserUpdates) {
            const user = await userRepository.findById(customer.user_id.toString());
            if (!user) {
                throw new NotFoundError('Associated User not found');
            }

            if (dto.email !== undefined) {
                const emailLower = dto.email.toLowerCase().trim();
                if (emailLower !== user.email) {
                    const emailTaken = await userRepository.findOne({ email: emailLower, _id: { $ne: user._id } });
                    if (emailTaken) throw new ConflictError('Email already taken');
                    user.email = emailLower;
                }
            }

            if (dto.phone !== undefined) {
                const phoneTrim = dto.phone.trim();
                if (phoneTrim !== user.phone) {
                    const phoneTaken = await userRepository.findOne({ phone: phoneTrim, _id: { $ne: user._id } });
                    if (phoneTaken) throw new ConflictError('Phone number already taken');
                    user.phone = phoneTrim;
                }
            }

            if (dto.password !== undefined) {
                user.password = dto.password; // pre-save hook will hash it
            }

            if (dto.full_name !== undefined) {
                user.full_name = dto.full_name.trim();
            }

            if (dto.avatar_url !== undefined) {
                user.avatar_url = dto.avatar_url;
            }

            if (dto.is_active !== undefined) {
                user.is_active = dto.is_active;
            }

            await user.save();
        }

        // Update customer fields
        const customerUpdates: Partial<ICustomer> = {};

        if (dto.tier_id !== undefined) {
            const tierExists = await TierConfig.findById(dto.tier_id);
            if (!tierExists) {
                throw new NotFoundError('Tier not found');
            }
            customerUpdates.tier_id = new Types.ObjectId(dto.tier_id);
        }

        if (dto.membership_points !== undefined) {
            customerUpdates.membership_points = dto.membership_points;
        }

        if (dto.reward_points !== undefined) {
            customerUpdates.reward_points = dto.reward_points;
        }

        if (dto.referral_code !== undefined) {
            const referralTrim = dto.referral_code.trim();
            if (referralTrim !== customer.referral_code) {
                const referralTaken = await customerRepository.findOne({ referral_code: referralTrim, _id: { $ne: customer._id } });
                if (referralTaken) throw new ConflictError('Referral code already taken');
                customerUpdates.referral_code = referralTrim;
            }
        }

        if (Object.keys(customerUpdates).length > 0) {
            await customerRepository.updateById(id, customerUpdates);
        }

        const updatedCustomer = await Customer
            .findById(id)
            .populate('user_id')
            .populate('tier_id')
            .exec();

        return updatedCustomer;
    }

    async deleteCustomer(id: string) {
        const customer = await customerRepository.findById(id);
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        // Hard delete User and Customer
        await userRepository.deleteById(customer.user_id.toString());
        await customerRepository.deleteById(id);
    }

    async updateTier(customer_id: string, tier: string) {
        await this.customerRepo.updateById(customer_id, { tier_id: new Types.ObjectId(tier) });
    }

    async getMembershipPoint(customer_id: string): Promise<IMembershipPoint> {
        const customer = await this.customerRepo.findOne({ user_id: customer_id });
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }
        const { tier } = await this.tierService.getTierById(customer.tier_id.toString());
        if (!tier) {
            throw new NotFoundError('Tier not found');
        }
        return {
            membership_points: customer.membership_points,
            membership_tier: tier.tier_name,
            max_point: tier.max_membership_points,
            min_point: tier.min_membership_points
        };
    }

    //Pass customer id and point from booking and increase membership point
    async increaseMembershipPoint(customer_id: string, point: number) {
        const customer = await this.customerRepo.findById(customer_id);
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }
        const { tier } = await this.tierService.getTierById(customer.tier_id.toString());
        if (!tier) {
            throw new NotFoundError('Tier not found');
        }
        const newPoint = customer.membership_points + point;
        const newTier = await this.tierService.checkTierIfChangeNewPoint(customer, newPoint);
        if (newTier !== TierStatus.SAME) {
            await this.customerRepo.updateById(customer_id, { membership_points: newPoint, tier_id: new Types.ObjectId(newTier) });
        } else {
            await this.customerRepo.updateById(customer_id, { membership_points: newPoint });
        }
        return this.getMembershipPoint(customer_id);
    }

    //Pass customer id and point from booking and decrease membership point
    async decreaseMembershipPoint(customer_id: string, point: number) {
        const customer = await this.customerRepo.findById(customer_id);
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }
        const { tier } = await this.tierService.getTierById(customer.tier_id.toString());
        if (!tier) {
            throw new NotFoundError('Tier not found');
        }
        const newPoint = Math.max(0, customer.membership_points - point);
        const newTier = await this.tierService.checkTierIfChangeNewPoint(customer, newPoint);
        if (newTier !== TierStatus.SAME) {
            await this.customerRepo.updateById(customer_id, { membership_points: newPoint, tier_id: new Types.ObjectId(newTier) });
        } else {
            await this.customerRepo.updateById(customer_id, { membership_points: newPoint });
        }
        return this.getMembershipPoint(customer_id);
    }

    //Reset membership point to 0 after a period of time
    async resetMembershipPoint(customer_id: string) {
        const customer = await this.customerRepo.findById(customer_id);
        if (!customer) {
            throw new NotFoundError('Customer not found');
        }
        const { tier } = await this.tierService.getTierById(customer.tier_id.toString());
        if (!tier) {
            throw new NotFoundError('Tier not found');
        }
        const newTier = await this.tierService.checkTierIfChangeNewPoint(customer, 0);
        if (newTier !== TierStatus.SAME) {
            await this.customerRepo.updateById(customer_id, { membership_points: 0, tier_id: new Types.ObjectId(newTier) });
        } else {
            await this.customerRepo.updateById(customer_id, { membership_points: 0 });
        }
        return this.getMembershipPoint(customer_id);    
    }
}

export const customerService = new CustomerService(); 