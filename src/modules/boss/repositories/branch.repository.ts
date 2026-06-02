import { BaseRepository } from "@common/repositories/base.repository";
import { Branch, IBranch } from "../../../models/branch.model";

export class BranchRepository extends BaseRepository<IBranch> {
  constructor() {
    super(Branch);
  }
    async isPhoneTaken(
        phone: string,
        excludeId?: string,
    ): Promise<boolean> {
        const query: any = {
            branch_phone: phone,
        };

        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const branch = await Branch.findOne(query);

        return !!branch;
    }
}

export const branchRepository = new BranchRepository();