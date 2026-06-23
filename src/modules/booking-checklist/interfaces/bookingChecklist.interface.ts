import { Types } from 'mongoose';

// ─── Sub-document DTO ────────────────────────────────────────────────────────

export interface IChecklistItemInput {
  label   : string;
  checked : boolean;
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface ICreateBookingChecklist {
  appointment_id     : string;
  checklist_items    : IChecklistItemInput[];
  note              ?: string | null;
  /** Paths populated by upload middleware — không nhận từ body */
  images            ?: string[];
  customer_signature?: string | null;
}

// ─── Update ──────────────────────────────────────────────────────────────────

export interface IUpdateBookingChecklist {
  checklist_items   ?: IChecklistItemInput[];
  note             ?: string | null;
  images           ?: string[];
  customer_signature?: string | null;
}
