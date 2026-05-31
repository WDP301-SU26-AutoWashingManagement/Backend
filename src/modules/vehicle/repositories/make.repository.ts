import { IMake, Make } from 'src/models/make.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class MakeRepository extends BaseRepository<IMake> {
  constructor() {
    super(Make);
  }

  findAll(): Promise<IMake[]> {
        return this.model
            .find()
            .sort({ make_name: 1 })
            .exec();
    }

    findByName(makeName: string): Promise<IMake | null> {
        return this.model
            .findOne({
                make_name: {
                    $regex: `^${makeName.trim()}$`,
                    $options: "i",
                },
            })
            .exec();
    }
}

export const makeRepository = new MakeRepository();