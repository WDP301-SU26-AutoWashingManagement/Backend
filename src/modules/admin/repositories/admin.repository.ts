import { BaseRepository } from "@common/repositories/base.repository";
import { Admin, IAdmin } from "../../../models/admin.model";

export class AdminRepository extends BaseRepository<IAdmin> {
    constructor() {
        super(Admin);
    }

    findById = (id: string) => {
        return Admin.findById(id).populate("user_id");
    };

    findMany = () => {
        return Admin.find().populate("user_id");
    };

    findByUserId = (userId: string) => {
        return Admin.findOne({ user_id: userId }).populate("user_id");
    };
}

export const adminRepository = new AdminRepository();