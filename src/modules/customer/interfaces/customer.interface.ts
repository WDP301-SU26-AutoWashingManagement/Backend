import { Types } from 'mongoose';

export interface ICreateCustomer {
  email: string;
  phone?: string;
  password?: string;
  full_name: string;
  avatar_url?: string;
  tier_id?: string;
  membership_points?: number;
  reward_points?: number;
  referral_code?: string;
}

export interface IUpdateCustomer {
  email?: string;
  phone?: string;
  password?: string;
  full_name?: string;
  avatar_url?: string;
  tier_id?: string;
  membership_points?: number;
  reward_points?: number;
  referral_code?: string;
  is_active?: boolean;
}

export interface IGetCustomerList {
  page?: number;
  limit?: number;
  search?: string;
  tier_id?: string;
  is_active?: boolean;
}
