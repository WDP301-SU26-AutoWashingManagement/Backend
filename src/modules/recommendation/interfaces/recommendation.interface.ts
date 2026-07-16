// ─── Request ─────────────────────────────────────────────────────────────────

export interface IGetBookingRecommendation {
  vehicle_id : string;
  branch_id? : string;
}

// ─── Response ────────────────────────────────────────────────────────────────

export type RecommendationSource = 'algorithm';

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

/** Gợi ý combo khi có >=2 service trong recommended_items cùng nằm trong 1 package active. */
export interface ISuggestedCombo {
  package_id           : string;
  package_name         : string;
  discount_percentage  : number;
  matched_service_ids  : string[]; // service_id trong recommended_items thuộc combo này
  original_price       : number;   // tổng giá gốc của các service matched (chưa giảm)
  discounted_price     : number;   // giá sau khi áp discount của package
}

export interface IBookingRecommendation {
  vehicle_id               : string;
  branch_id                : string | null;
  recommended_items        : IRecommendedItem[];
  reason                   : string;
  applicable_promotion_id  : string | null;
  applicable_promotion     : IApplicablePromotion | null;
  suggested_combo          : ISuggestedCombo | null;
  estimated_total          : number;
  suggested_scheduled_at   : string | null;
  source                   : RecommendationSource;
  generated_at              : string;
}

// ─── Internal ────────────────────────────────────────────────────────────────