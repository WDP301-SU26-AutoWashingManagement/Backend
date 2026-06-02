import { Document, FilterQuery, Model, PaginateModel, PaginateOptions, PaginateResult, UpdateQuery } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  findById    = (id: string)                                    => this.model.findById(id).exec();
  findOne     = (filter: FilterQuery<T>)                        => this.model.findOne(filter).exec();
  findMany    = (filter: FilterQuery<T> = {})                   => this.model.find(filter).exec();
  create      = (data: Partial<T>)                              => this.model.create(data);
  updateById  = (id: string, update: UpdateQuery<T>)            => this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
  updateOne   = (filter: FilterQuery<T>, update: UpdateQuery<T>) => this.model.updateOne(filter, update, { runValidators: true }).exec();
  updateMany  = (filter: FilterQuery<T>, update: UpdateQuery<T>) => this.model.updateMany(filter, update, { runValidators: true }).exec();
  deleteById  = (id: string)                                    => this.model.findByIdAndDelete(id).exec();
  deleteMany  = (filter: FilterQuery<T>): Promise<any>          => this.model.deleteMany(filter).exec();
  exists      = async (filter: FilterQuery<T>)                  => !!(await this.model.exists(filter));
  count       = (filter: FilterQuery<T> = {})                   => this.model.countDocuments(filter).exec();
  paginate    = (filter: FilterQuery<T>, opts: PaginateOptions): Promise<PaginateResult<T>> =>
    (this.model as PaginateModel<T>).paginate(filter, opts);
}