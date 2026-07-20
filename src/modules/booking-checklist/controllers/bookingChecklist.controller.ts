import { Request, Response, NextFunction } from 'express';
import { bookingChecklistService } from '../services/bookingChecklist.service';
import { sendSuccess, sendCreated } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import {
  ICreateBookingChecklist,
  ICreateBookingReport,
  IGetReportListQuery,
  IUpdateBookingChecklist,
} from '../interfaces/bookingChecklist.interface';

export class BookingChecklistController {
  private readonly svc = bookingChecklistService;

  // ── POST /api/booking-checklists ──────────────────────────────────────────

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto: ICreateBookingChecklist = {
        appointment_id    : req.body.appointment_id,
        checklist_items   : req.body.checklist_items   ?? [],
        note              : req.body.note              ?? null,
        images            : req.body.images            ?? [],
        customer_signature: req.body.customer_signature ?? null,
        customer_signature_after: req.body.customer_signature_after ?? null,
      };

      const checklist = await this.svc.createChecklist(dto);
      sendCreated(res, checklist, 'Tạo checklist thành công');
    } catch (err) {
      next(err);
    }
  };

  // ── PUT /api/booking-checklists/:id ───────────────────────────────────────

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto: IUpdateBookingChecklist = {
        checklist_items   : req.body.checklist_items,
        note              : req.body.note,
        images            : req.body.images,
        customer_signature: req.body.customer_signature,
        customer_signature_after: req.body.customer_signature_after,
      };

      const updated = await this.svc.updateChecklist(req.params.id, dto);
      sendSuccess(res, updated, 'Cập nhật checklist thành công');
    } catch (err) {
      next(err);
    }
  };

  // ── GET /api/booking-checklists/:id ──────────────────────────────────────

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const checklist = await this.svc.getById(req.params.id);
      sendSuccess(res, checklist, 'Lấy checklist thành công');
    } catch (err) {
      next(err);
    }
  };

  // ── GET /api/booking-checklists/appointment/:appointmentId ───────────────

  getByAppointmentId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const checklist = await this.svc.getByAppointmentId(req.params.appointmentId);
      sendSuccess(res, checklist, 'Lấy checklist theo appointment thành công');
    } catch (err) {
      next(err);
    }
  };

  // ── GET /api/booking-checklists/:id/export-pdf ───────────────────────────

  exportPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.svc.exportPdf(req.params.id, res);
    } catch (err) {
      next(err);
    }
  };

  // ── POST /api/booking-checklists/appointment/:appointmentId/report ───────

  createReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dto: ICreateBookingReport = {
        title      : req.body.title,
        fullname   : req.body.fullname,
        description: req.body.description ?? null,
        evidence   : req.body.evidence ?? [],
        phone      : req.body.phone ?? null,
        email      : req.body.email ?? null,
        isConfirm  : req.body.isConfirm ?? false,
      };

      const report = await this.svc.createReport(req.params.appointmentId, req.user.id, dto);
      sendCreated(res, report, 'Tạo report thành công');
    } catch (err) {
      next(err);
    }
  };

  // ── PATCH /api/booking-checklists/appointment/:appointmentId/report/confirm

  confirmReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const report = await this.svc.confirmReport(req.params.appointmentId);
      sendSuccess(res, report, 'Xác nhận report thành công');
    } catch (err) {
      next(err);
    }
  };

  // ── GET /api/booking-checklists/reports ───────────────────────────────────

  getAllReports = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as IGetReportListQuery;
      const dto: IGetReportListQuery = {
        page     : query.page      ? Number(query.page)  : undefined,
        limit    : query.limit     ? Number(query.limit) : undefined,
        isConfirm: query.isConfirm !== undefined ? String(query.isConfirm) === 'true' : undefined,
      };

      const result = await this.svc.getAllReports(dto, req.user.id, req.user.role);
      sendPaginated(res, result, 'Lấy danh sách report thành công');
    } catch (err) {
      next(err);
    }
  };

  // ── DELETE /api/booking-checklists/appointment/:appointmentId/report ─────

  deleteReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.svc.deleteReport(req.params.appointmentId, req.user.id, req.user.role);
      sendSuccess(res, null, 'Xoá report thành công');
    } catch (err) {
      next(err);
    }
  };
}

export const bookingChecklistController = new BookingChecklistController();