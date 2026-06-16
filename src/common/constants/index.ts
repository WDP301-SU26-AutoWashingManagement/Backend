export const BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_progress', 'washed', 'completed', 'cancelled'] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];

export const POINT_STAGES     = ['earned', 'redeemed', 'expired', 'bonus'] as const;
export const POINT_TYPES      = ['membership', 'reward'] as const;
export const DISCOUNT_TYPES   = ['percentage', 'fixed'] as const;
export const CHANNELS         = ['push', 'email', 'in_app'] as const;
export const REG_CHANNELS     = ['google', 'admin'] as const;
export const BOOKING_SOURCES  = ['app', 'web', 'admin'] as const;

// Business rules for Booking Schedule
export const BUSINESS_HOURS = { open: 7, close: 19 };       // 07:00 – 19:00
export const OPEN_DAYS      = [0, 1, 2, 3, 4, 5, 6];        // CN, Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7
export const MIN_ADVANCE_MINUTES = 60;                      // Phải đặt trước ít nhất 60 phút
export const SLOT_DURATION_MINUTES = 30;                    // Mỗi slot cách nhau 30 phút
export const DEFAULT_BOOKING_WINDOW_DAYS = 1;               // Cửa sổ đặt lịch mặc định là 1 ngày

// Business rule for booking price
export const MAX_PRICE_DISCOUNT_PERCENTAGE = 50; // Giảm giá tối đa 50% so với giá gốc để tránh lỗ