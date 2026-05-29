import mongoose, { Schema, Document } from "mongoose";

interface ICounter extends Document {
    key: string;
    seq: number;
}

const counterSchema = new Schema<ICounter>({
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
});

// Tự sinh code cho tất cả bảng gọi, luôn luôn unique cho mọi bảng
export async function generateCode(
  key: string,
  prefix: string,
  padLength: number = 6
): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const number = counter.seq.toString().padStart(padLength, "0");

  return `${prefix}${number}`;
}

export const Counter = mongoose.model<ICounter>("Counter", counterSchema);
