import { Types } from 'mongoose';

// ─── Sub-document DTO ────────────────────────────────────────────────────────

export interface IChecklistItemInput {
  label   : string;
  checked : boolean;
}

export interface IBookingReportInput {
  title       : string;
  fullname    : string;
  description?: string | null;
  evidence?   : string[];
  phone?      : string | null;
  email?      : string | null;
  isConfirm?  : boolean;
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface ICreateBookingChecklist {
  appointment_id     : string;
  checklist_items    : IChecklistItemInput[];
  note              ?: string | null;
  /** Paths populated by upload middleware — không nhận từ body */
  images            ?: string[];
  customer_signature?: string | null;
  customer_signature_after?: string | null;
}

// ─── Update ──────────────────────────────────────────────────────────────────

export interface IUpdateBookingChecklist {
  checklist_items   ?: IChecklistItemInput[];
  note             ?: string | null;
  images           ?: string[];
  customer_signature?: string | null;
  customer_signature_after?: string | null;
}

export interface ICreateBookingReport {
  title       : string;
  fullname    : string;
  description?: string | null;
  evidence?   : string[];
  phone?      : string | null;
  email?      : string | null;
  isConfirm?  : boolean;
}

// ─── Get list ────────────────────────────────────────────────────────────────

/**
 * Query params cho GET /booking-checklists/reports (danh sách report).
 */
export interface IGetReportListQuery {
  page?     : number;
  limit?    : number;
  isConfirm?: boolean;
}