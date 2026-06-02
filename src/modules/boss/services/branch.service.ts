import { BadRequestError, NotFoundError } from "@common/utils/AppError";
import { branchRepository } from "../repositories/branch.repository";
import { IBranchRequest } from "../interfaces/branch.interface";

export class BranchService {
    private readonly branchRepo = branchRepository;
    async getBranch(branchId: string) {
        const branch = await this.branchRepo.findById(branchId);
        if (!branch) throw new NotFoundError('Chi nhánh không tìm thấy');
        return branch;
    }

    async getBranches() {
        return this.branchRepo.findMany();
    }

    async createBranch(data: IBranchRequest) {
        if (data.branch_phone) {
            const taken = await branchRepository.isPhoneTaken(
                data.branch_phone,
            );

            if (taken) {
                throw new BadRequestError(
                    "Số điện thoại chi nhánh đã được sử dụng",
                );
            }
        }

        const branch = await branchRepository.create(data);

        return await branchRepository.findById(
            branch._id.toString(),
        );
    }

    async updateBranch(
        branchId: string,
        data: IBranchRequest,
    ) {
        const branch = await branchRepository.findById(branchId);

        if (!branch) {
            throw new NotFoundError("Branch not found");
        }

        if (data.branch_phone) {
            const taken = await branchRepository.isPhoneTaken(
                data.branch_phone,
                branchId,
            );

            if (taken) {
                throw new BadRequestError(
                    "Số điện thoại chi nhánh đã được sử dụng",
                );
            }
        }

        await branchRepository.updateById(branchId, data);

        return await branchRepository.findById(branchId);
    }

    async deleteBranch(branchId: string) {
        const branch = await branchRepository.findById(branchId);

        if (!branch) {
            throw new NotFoundError("Không tìm thấy chi nhánh");
        }

        if (!branch.is_active) {
            throw new BadRequestError("Chi nhánh đã ngừng hoạt động");
        }

        await branchRepository.updateById(branchId, {
            is_active: false,
        });

        return {
            message: "Ngừng hoạt động chi nhánh thành công",
        };
    }

    async activateBranch(branchId: string) {
        const branch = await branchRepository.findById(branchId);

        if (!branch) {
            throw new NotFoundError("Không tìm thấy chi nhánh");
        }

        if (branch.is_active) {
            throw new BadRequestError("Chi nhánh đang hoạt động");
        }

        await branchRepository.updateById(branchId, {
            is_active: true,
        });

        return {
            message: "Kích hoạt chi nhánh thành công",
        };
    }
}

export const branchService = new BranchService();