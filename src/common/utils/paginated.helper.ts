import { Response } from 'express';
import { PaginateResult } from 'mongoose';

// ----------------------------------------------------------------
// Shape mà sendPaginated yêu cầu — page luôn là number
// ----------------------------------------------------------------
interface PaginatedShape<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
}

/**
 * Chuyển PaginateResult (page?: number) → PaginatedShape (page: number)
 * Dùng khi truyền kết quả từ mongoose-paginate-v2 vào sendPaginated.
 */
export const toPaginatedShape = <T>(result: PaginateResult<T>, fallbackPage = 1): PaginatedShape<T> => ({
    docs:       result.docs,
    totalDocs:  result.totalDocs,
    limit:      result.limit,
    page:       result.page ?? fallbackPage,
    totalPages: result.totalPages,
});

/**
 * Gửi response phân trang chuẩn.
 * Nhận trực tiếp PaginateResult — không cần ép kiểu ngoài.
 */
export const sendPaginated = <T>(
    res: Response,
    result: PaginateResult<T>,
    message = 'Success',
    fallbackPage = 1,
) =>
    res.status(200).json({
        success: true,
        message,
        data: result.docs,
        pagination: {
            totalDocs:  result.totalDocs,
            limit:      result.limit,
            page:       result.page ?? fallbackPage,
            totalPages: result.totalPages,
        },
    });