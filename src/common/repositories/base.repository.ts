/**
 * base.repository.ts
 *
 * Cơ chế routing read/write:
 *  • wm → mongoose.connection (default, readPreference=primary) — WRITE
 *  • rm → read connection pool (readPreference=secondaryPreferred) — READ
 *
 * Tại sao KHÔNG dùng model.bind(conn):
 *  model.bind() mất `this` context khi Mongoose internal gọi chéo method
 *  → lỗi "Model.find() cannot run without a model as this".
 *
 * Giải pháp đúng: dùng connection.model(modelName, schema)
 *  → Mongoose tự tra schema từ model gốc và tạo proxy trên đúng connection,
 *    giữ nguyên toàn bộ context.
 */

import {
  Document,
  FilterQuery,
  Model,
  PaginateModel,
  PaginateOptions,
  PaginateResult,
  UpdateQuery,
} from 'mongoose';
import { getReadConnection, getWriteConnection } from '../../configs/db.config';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Model proxy trên write connection (primary).
   * Dùng connection.model() để giữ nguyên this-context của Mongoose.
   */
  protected get wm(): Model<T> {
    const conn = getWriteConnection();
    // Nếu model đã được đăng ký trên connection này → trả về luôn (cache)
    if (conn.modelNames().includes(this.model.modelName)) {
      return conn.model<T>(this.model.modelName);
    }
    return conn.model<T>(this.model.modelName, this.model.schema);
  }

  /**
   * Model proxy trên read connection (secondaryPreferred, round-robin).
   * Dùng connection.model() để giữ nguyên this-context của Mongoose.
   */
  protected get rm(): Model<T> {
    const conn = getReadConnection();
    if (conn.modelNames().includes(this.model.modelName)) {
      return conn.model<T>(this.model.modelName);
    }
    return conn.model<T>(this.model.modelName, this.model.schema);
  }

  // ─── READ (→ replica) ──────────────────────────────────────────────────────

  find = async (filter: FilterQuery<T>, options: Record<string, any> = {}): Promise<T[]> =>
    this.rm.find(filter, null, options);

  findById  = (id: string)                 => this.rm.findById(id).exec();
  findOne   = (filter: FilterQuery<T>)     => this.rm.findOne(filter).exec();
  findMany  = (filter: FilterQuery<T> = {}) => this.rm.find(filter).exec();
  exists    = async (filter: FilterQuery<T>) => !!(await this.rm.exists(filter));
  count     = (filter: FilterQuery<T> = {}) => this.rm.countDocuments(filter).exec();
  countDocuments = (filter: FilterQuery<T> = {}): Promise<number> => this.rm.countDocuments(filter);

  paginate = (filter: FilterQuery<T>, opts: PaginateOptions): Promise<PaginateResult<T>> =>
    (this.rm as PaginateModel<T>).paginate(filter, opts);

  // ─── WRITE (→ primary) ─────────────────────────────────────────────────────

  create     = (data: Partial<T>)                               => this.wm.create(data);
  insertMany = (data: Partial<T>[])                             => this.wm.insertMany(data);
  updateById = (id: string, update: UpdateQuery<T>)             => this.wm.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
  updateOne  = (filter: FilterQuery<T>, update: UpdateQuery<T>) => this.wm.updateOne(filter, update, { runValidators: true }).exec();
  updateMany = (filter: FilterQuery<T>, update: UpdateQuery<T>) => this.wm.updateMany(filter, update, { runValidators: true }).exec();
  deleteById = (id: string)                                     => this.wm.findByIdAndDelete(id).exec();
  deleteMany = (filter: FilterQuery<T>): Promise<any>           => this.wm.deleteMany(filter).exec();
}