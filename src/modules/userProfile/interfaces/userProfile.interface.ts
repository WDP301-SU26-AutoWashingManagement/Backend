import { UserRole } from '@common/types';

// ─── getProfile response ───────────────────────────────────────────────────────
// User fields + role document populated (Customer | Staff | Manager | Admin)

export interface IUserProfileResponse {
  // User fields
  _id: string;
  email: string;
  phone?: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  role_data: ICustomerRoleData | IStaffRoleData | IManagerRoleData | IAdminRoleData | null;
}

export interface ICustomerRoleData {
  _id: string;
  tier_id: string | null;
  registration_channel: 'app' | 'google' | 'admin';
  has_online_access: boolean;
  membership_points: number;
  reward_points: number;
  referral_code: string;
}

export interface IStaffRoleData {
  _id: string;
  shift_per_week: number;
  salary_coefficient: number;
}

export interface IManagerRoleData {
  _id: string;
  salary_coefficient: number;
}

export interface IAdminRoleData {
  _id: string;
}

// ─── updateProfile payloads per role ──────────────────────────────────────────

// Shared User fields — all roles can update these
export interface IUpdateUserFields {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

// Customer-specific updatable fields
export interface IUpdateCustomerFields {
  has_online_access?: boolean;
}

// Staff / Manager / Admin — no extra updatable fields via this endpoint
export interface IUpdateStaffFields {}
export interface IUpdateManagerFields {}
export interface IUpdateAdminFields {}

// Union payload passed from controller
export type IUpdateProfileData =
  | (IUpdateUserFields & IUpdateCustomerFields)  // customer
  | (IUpdateUserFields & IUpdateStaffFields)      // staff
  | (IUpdateUserFields & IUpdateManagerFields)    // manager
  | (IUpdateUserFields & IUpdateAdminFields);     // admin

// ─── changePassword ────────────────────────────────────────────────────────────
export interface IChangePasswordData {
  old_password: string;
  new_password: string;
}
