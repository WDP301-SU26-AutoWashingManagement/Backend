import { UserRole } from '../types';

export const ADMIN_SEED = {
  email: 'admin@gmail.com',
  phone: '0123456789',
  password: 'Password123!',
  role: UserRole.ADMIN,
  full_name: 'System Administrator',
  is_active: true,
  is_email_verified: true,
  is_phone_verified: true,
};
