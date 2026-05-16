export const BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled'] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];

export const POINT_STAGES     = ['earned', 'redeemed', 'expired', 'bonus'] as const;
export const POINT_TYPES      = ['membership', 'reward'] as const;
export const DISCOUNT_TYPES   = ['percentage', 'fixed'] as const;
export const POST_TYPES       = ['blog', 'promotion', 'announcement'] as const;
export const POST_STATUSES    = ['draft', 'published', 'archived'] as const;
export const CHANNELS         = ['push', 'email', 'sms', 'in_app'] as const;
export const REG_CHANNELS     = ['app', 'google', 'admin'] as const;
export const BOOKING_SOURCES  = ['app', 'web', 'admin'] as const;