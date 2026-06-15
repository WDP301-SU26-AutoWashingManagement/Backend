import { Request, Response, NextFunction } from 'express';
import { invoiceService } from '../services/invoice.service';
import { sendSuccess, sendCreated } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';

export class InvoiceController {
  private readonly svc = invoiceService;

  /** POST /invoices/:id/payment-link – tạo PayOS link từ invoice draft */
  createPaymentLink = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const invoice = await this.svc.createPaymentLink(
        req.params.id,
        Number(req.body.expire_minutes) || 30,
      );
      sendCreated(res, {
        invoice_id    : invoice._id,
        invoice_number: invoice.invoice_number,
        checkout_url  : invoice.checkout_url,
        qr_code       : invoice.qr_code,
        status        : invoice.invoice_status,
        expired_at    : invoice.expired_at,
      }, 'Tạo link thanh toán thành công');
    } catch (err) {
      next(err);
    }
  };

  /** POST /invoices/webhook – PayOS gọi vào đây (no auth) */
  webhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.svc.handleWebhook(req.body);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  /** PATCH /invoices/:id/cancel-payment – huỷ link PayOS */
  cancelPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const invoice = await this.svc.cancelPaymentLink(req.params.id, req.body.reason);
      sendSuccess(res, invoice, 'Hủy link thanh toán');
    } catch (err) {
      next(err);
    }
  };

  /** GET /invoices/:id/sync – đồng bộ trạng thái với PayOS */
  sync = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const invoice = await this.svc.syncInvoiceStatus(req.params.id);
      sendSuccess(res, invoice, 'Đã đồng bộ trạng thái invoice');
    } catch (err) {
      next(err);
    }
  };

  /** PATCH /invoices/:id/confirm-cash – xác nhận thu tiền mặt */
  confirmCash = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const invoice = await this.svc.confirmCashPayment(req.params.id, req.user.id);
      sendSuccess(res, invoice, 'Thanh toán tiền mặt thành công');
    } catch (err) {
      next(err);
    }
  };

  /** GET /invoices/:id */
  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const invoice = await this.svc.getById(req.params.id);
      sendSuccess(res, invoice, 'Invoice fetched');
    } catch (err) {
      next(err);
    }
  };

  /** GET /invoices – admin */
  getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.svc.getList(req.query as any);
      sendPaginated(res, result, 'Invoices fetched');
    } catch (err) {
      next(err);
    }
  };
}

export const invoiceController = new InvoiceController();