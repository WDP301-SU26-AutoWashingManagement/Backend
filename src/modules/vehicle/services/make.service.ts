import {makeRepository} from "../repositories/make.repository";

class MakeService {
    private readonly makeRepo = makeRepository
    async getList() {
        return this.makeRepo.findAll();
    }

    async getByName(makeName: string) {
        return this.makeRepo.findByName(makeName);
    }
}

export const makeService = new MakeService();