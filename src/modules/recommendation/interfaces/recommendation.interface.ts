// ─── Request ─────────────────────────────────────────────────────────────────

export interface IGetBookingRecommendation {
  vehicle_id : string;
  branch_id? : string;
}

// ─── Response ────────────────────────────────────────────────────────────────

export type RecommendationSource = 'ai' | 'fallback';

export interface IRecommendedItem {
  service_id          : string;
  service_package_id? : string | null;
  name                : string;
  price               : number;
  duration_minutes    : number;
}

/** Thông tin promotion đã populate, đính kèm trong response thay vì chỉ trả về id. */
export interface IApplicablePromotion {
  id                   : string;
  promotion_name       : string;
  code                 : string;
  type                 : string;
  discount_percentage? : number;
  discount_amount?     : number;
  min_order_amount     : number;
}

export interface IBookingRecommendation {
  vehicle_id               : string;
  branch_id                : string | null;
  recommended_items        : IRecommendedItem[];
  reason                   : string;
  applicable_promotion_id  : string | null;
  applicable_promotion     : IApplicablePromotion | null;
  estimated_total          : number;
  suggested_scheduled_at   : string | null;
  source                   : RecommendationSource;
  generated_at              : string;
}

// ─── Internal ────────────────────────────────────────────────────────────────

/** 1 ứng viên (service hoặc package) trong tập retrieval, đã chuẩn hoá để so sánh/rank. */
export interface ICandidateItem {
  id                   : string;
  kind                 : 'service' | 'package';
  name                 : string;
  description          : string;
  price                : number;            // service: service_price | package: tổng giá đã trừ discount
  duration_minutes     : number;            // package: tổng duration các service trong gói
  discount_percentage? : number;            // chỉ có ở package
  service_ids          : string[];          // service: [chính nó] | package: các service con
  embedding            : number[];
  score?               : number;
}

/** Kết quả thô gọi Gemini generateContent (trước khi validate lại id). */
export interface IGeminiRecommendationDraft {
  recommended_package_id?  : string;
  recommended_service_ids? : string[];
  promotion_id?            : string;
  reason?                  : string;
}
