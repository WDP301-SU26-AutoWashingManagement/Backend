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
  suggested_combo          : ISuggestedCombo | null;
  estimated_total          : number;
  suggested_scheduled_at   : string | null;
  source                   : RecommendationSource;
  generated_at              : string;
}

// ─── Internal ────────────────────────────────────────────────────────────────