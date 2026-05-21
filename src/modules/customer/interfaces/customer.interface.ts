import { MongoId } from '../../../common/types';

export interface IUpdateProfileData {
    full_name?: string;
    phone?: string;
    identity_number?: string;
    avatar_url?: string;
}

export interface IChangePasswordData {
    old_password: string;
    new_password: string;
}
