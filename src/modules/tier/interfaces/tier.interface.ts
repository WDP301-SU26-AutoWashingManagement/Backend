import { Types } from 'mongoose';
import { TierClass } from '@common/types/enum';

export interface ICreateTier {
  tier_name: TierClass;
  min_membership_points: number;
  max_membership_points: number;
  booking_window_days: number;
  discount_percentage: number;
  free_features?: Types.ObjectId[];
}

export interface IUpdateTier {
  tier_name?: TierClass;
  min_membership_points?: number;
  max_membership_points?: number;
  booking_window_days?: number;
  discount_percentage?: number;
  free_features?: Types.ObjectId[];
}

export interface IGetTierList {
  page?: number;
  limit?: number;
  search?: string;
  min_points_from?: number; 
  min_points_to?: number;
  max_points_from?: number;
  max_points_to?: number;
}

export enum TierStatus {
  CHANGE = "CHANGE",
  SAME = "SAME" 
}