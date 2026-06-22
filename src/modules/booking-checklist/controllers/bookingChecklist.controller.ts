import { Request, Response, NextFunction } from 'express';
import { bookingChecklistService } from '../services/bookingChecklist.service';
import { sendSuccess, sendCreated } from '../../../common/utils/apiResponse';
import {
  ICreateBookingChecklist,
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
}

export const bookingChecklistController = new BookingChecklistController();
