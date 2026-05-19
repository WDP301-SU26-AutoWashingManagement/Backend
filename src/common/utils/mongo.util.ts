import { Types } from 'mongoose';

export const toObjectId = (id: string | Types.ObjectId) => {
  return typeof id === 'string'
    ? new Types.ObjectId(id)
    : id;
};