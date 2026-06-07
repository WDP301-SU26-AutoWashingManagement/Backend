export interface ICreateTier {
  tier_name: string;
  min_membership_points: number;
  booking_window_days?: number;
  discount_percentage?: number;
  perks_note?: string;
}

export interface IUpdateTier {
  tier_name?: string;
  min_membership_points?: number;
  booking_window_days?: number;
  discount_percentage?: number;
  perks_note?: string;
}

export interface IGetTierList {
  page?: number;
  limit?: number;
  search?: string;
  min_points_from?: number;
  min_points_to?: number;
}

export enum TierStatus {
  UPGRADE = "UPGRADE",
  DOWNGRADE = "DOWNGRADE",
  SAME = "SAME" 
}