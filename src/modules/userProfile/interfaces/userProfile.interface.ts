import { UserRole, StaffRole } from '../../../common/types/enum';

export interface IUserProfileResponse {
  phone?: string;

  full_name: string;
  avatar_url?: string;

  role?: UserRole;

  is_active: boolean;
  is_phone_verified: boolean;


  role_data:
    | ICustomerRoleData
    | IStaffRoleData
    | null;
}

export interface ICustomerRoleData {
  customer_code: string;
  tier_id: string;
  referral_code: string;
  membership_points: number;
  reward_points: number;
}

export interface IStaffRoleData {
  branch_id: string | null;
  staff_type: StaffRole;
  hire_date: Date;
  hour_per_week: number;
  salary_coefficient: number;
}

export interface IUpdateProfileData {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface IUpdateCustomerRoleData {
  tier_id?: string;
  membership_points?: number;
  reward_points?: number;
}

export interface IUpdateStaffRoleData {
  branch_id?: string | null;
  staff_type?: StaffRole;
  hire_date?: Date;
  hour_per_week?: number;
  salary_coefficient?: number;
}

export interface IChangePasswordData {
  old_password: string;
  new_password: string;
}
