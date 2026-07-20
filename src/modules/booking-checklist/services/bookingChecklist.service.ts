import path from 'path';
import fs   from 'fs';
import PDFDocument from 'pdfkit';

// ─── Font paths (Noto Sans – hỗ trợ tiếng Việt) ─────────────────────────────
// Tự detect: dev (ts-node từ src/) hoặc prod (node từ dist/)
const _srcFonts  = path.join(process.cwd(), 'src',  'assets', 'fonts');
const _distFonts = path.join(process.cwd(), 'dist', 'assets', 'fonts');
const FONT_DIR   = fs.existsSync(_srcFonts) ? _srcFonts : _distFonts;
const FONT_REGULAR  = path.join(FONT_DIR, 'NotoSans-Regular.ttf');
const FONT_BOLD     = path.join(FONT_DIR, 'NotoSans-Bold.ttf');
const FONT_ITALIC   = path.join(FONT_DIR, 'NotoSans-Italic.ttf');
import { Response }  from 'express';
import { Types }     from 'mongoose';

import { bookingChecklistRepository } from '../repositories/bookingChecklist.repository';
import {
  ICreateBookingChecklist,
  IUpdateBookingChecklist,
} from '../interfaces/bookingChecklist.interface';
import { Appointment, BookingStatus }  from '../../../models/appointment.model';
import { ConflictError, NotFoundError, BadRequestError } from '../../../common/utils/AppError';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day  : '2-digit',
    month: '2-digit',
    year : 'numeric',
    hour : '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ─── Service ─────────────────────────────────────────────────────────────────

class BookingChecklistService {
  private readonly repo = bookingChecklistRepository;

  // ── 1. Tạo checklist ──────────────────────────────────────────────────────

  async createChecklist(dto: ICreateBookingChecklist) {
    // Validate appointment tồn tại
    const appt = await Appointment.findById(dto.appointment_id);
    if (!appt) throw new NotFoundError('Appointment không tồn tại');

    // 1 appointment chỉ có 1 checklist
    const existing = await this.repo.findOne({ appointment_id: dto.appointment_id });
    if (existing) throw new ConflictError('Appointment đã có checklist. Vui lòng cập nhật thay vì tạo mới.');

    const checklist = await this.repo.create({
      appointment_id    : new Types.ObjectId(dto.appointment_id),
      checklist_items   : dto.checklist_items ?? [],
      note              : dto.note              ?? null,
      images            : dto.images            ?? [],
      customer_signature: dto.customer_signature ?? null,
    });

    if (appt.booking_status === BookingStatus.CONFIRMED || appt.booking_status === BookingStatus.PENDING) {
      appt.booking_status = BookingStatus.ARRIVED;
      await appt.save();
    }

    return checklist;
  }

  // ── 2. Cập nhật checklist ─────────────────────────────────────────────────

  async updateChecklist(id: string, dto: IUpdateBookingChecklist) {
    const checklist = await this.repo.findById(id);
    if (!checklist) throw new NotFoundError('Checklist không tồn tại');

    const updated = await this.repo.updateById(id, {
      ...(dto.checklist_items    !== undefined && { checklist_items   : dto.checklist_items    }),
      ...(dto.note               !== undefined && { note              : dto.note               }),
      ...(dto.customer_signature !== undefined && { customer_signature: dto.customer_signature }),
      // Nếu upload ảnh mới thì APPEND vào danh sách ảnh cũ
      ...(dto.images && dto.images.length > 0 && {
        images: [...checklist.images, ...dto.images],
      }),
    });

    return updated;
  }

  // ── 3. Lấy chi tiết theo _id ──────────────────────────────────────────────

  async getById(id: string) {
    const checklist = await this.repo.findByIdWithPopulate(id);
    if (!checklist) throw new NotFoundError('Checklist không tồn tại');
    return checklist;
  }

  // ── 4. Lấy checklist theo appointment ────────────────────────────────────

  async getByAppointmentId(appointmentId: string) {
    const checklist = await this.repo.findByAppointmentId(appointmentId);
    if (!checklist) throw new NotFoundError('Checklist cho appointment này chưa được tạo');
    return checklist;
  }

  // ── 5. Export PDF ─────────────────────────────────────────────────────────

  async exportPdf(id: string, res: Response): Promise<void> {
    const checklist = await this.repo.findByIdWithPopulate(id);
    if (!checklist) throw new NotFoundError('Checklist không tồn tại');

    // ── Trích xuất dữ liệu populate ─────────────────────────────────────────
    const appt       = checklist.appointment_id as any;
    const customer   = appt?.customer_id        as any;
    const user       = customer?.user_id         as any;
    const vehicle    = appt?.vehicle_id          as any;
    const branch     = appt?.branch_id           as any;

    const apptCode    = appt?.appointment_code  ?? '—';
    const scheduledAt = appt?.scheduled_at
      ? formatDate(new Date(appt.scheduled_at))
      : '—';
    const customerName = user?.full_name  ?? '—';
    const customerPhone = user?.phone     ?? '—';
    const vehicleInfo   = vehicle
      ? `${vehicle.license_plate} · ${vehicle.vehicle_model} · ${vehicle.color}`
      : '—';
    const branchInfo = branch?.branch_address
      ? [
          branch.branch_address.street,
          branch.branch_address.ward,
          branch.branch_address.district,
          branch.branch_address.city,
        ]
          .filter(Boolean)
          .join(', ')
      : '—';
    const createdAt = formatDate(new Date((checklist as any).createdAt as Date));

    // ── Khởi tạo PDF ─────────────────────────────────────────────────────────
    const doc = new PDFDocument({
      size  : 'A4',
      margin: 40,
      info  : {
        Title  : `Biên bản tiếp nhận xe – ${apptCode}`,
        Author : 'Hybrid Wash System',
        Subject: 'Checklist tiếp nhận xe',
      },
    });

    // Đăng ký Noto Sans để hỗ trợ tiếng Việt
    doc.registerFont('NotoSans',        FONT_REGULAR);
    doc.registerFont('NotoSans-Bold',   FONT_BOLD);
    doc.registerFont('NotoSans-Italic', FONT_ITALIC);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="checklist-${apptCode}.pdf"`,
    );
    doc.pipe(res);

    const PAGE_WIDTH  = doc.page.width  - 80; // sau margin 40 mỗi bên
    const COL_LEFT    = 40;
    const ACCENT      = '#1976D2';
    const LIGHT_GRAY  = '#F5F5F5';
    const DARK_TEXT   = '#212121';
    const MID_TEXT    = '#555555';

    // ── HEADER ───────────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 80)
      .fill(ACCENT);

    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('NotoSans-Bold')
      .text('Hybrid Wash', COL_LEFT, 20, { align: 'left' });

    doc
      .fontSize(11)
      .font('NotoSans')
      .text('Biên bản tiếp nhận xe', COL_LEFT, 48, { align: 'left' });

    doc
      .fontSize(10)
      .text(`Mã biên bản: ${apptCode}`, 0, 48, { align: 'right', width: doc.page.width - COL_LEFT });

    doc.moveDown(4);

    // ── THÔNG TIN ĐƠN ────────────────────────────────────────────────────────
    const HEADER_H = 26;
    const ROW_H    = 24;

    const drawSectionHeader = (title: string) => {
      const y = doc.y;
      doc.rect(COL_LEFT, y, PAGE_WIDTH, HEADER_H).fill(ACCENT);
      doc
        .fillColor('#FFFFFF')
        .fontSize(11)
        .font('NotoSans-Bold')
        .text(title, COL_LEFT + 8, y + 7, { width: PAGE_WIDTH - 16, lineBreak: false });
      doc.y = y + HEADER_H + 6;
    };

    const drawRow = (label: string, value: string, bg = false) => {
      const y = doc.y;
      if (bg) doc.rect(COL_LEFT, y, PAGE_WIDTH, ROW_H).fill(LIGHT_GRAY);
      doc
        .fillColor(MID_TEXT)
        .fontSize(9)
        .font('NotoSans-Bold')
        .text(label, COL_LEFT + 8, y + 7, { width: 150, lineBreak: false });
      doc
        .fillColor(DARK_TEXT)
        .font('NotoSans')
        .text(value, COL_LEFT + 165, y + 7, { width: PAGE_WIDTH - 175, lineBreak: false });
      doc.y = y + ROW_H;
    };

    // Section: Thông tin đơn
    drawSectionHeader('THÔNG TIN ĐƠN');
    drawRow('Mã lịch hẹn',   apptCode,      true);
    drawRow('Ngày nhận xe',   scheduledAt,   false);
    drawRow('Khách hàng',     customerName,  true);
    drawRow('Số điện thoại',  customerPhone, false);
    drawRow('Xe',             vehicleInfo,   true);
    drawRow('Chi nhánh',      branchInfo,    false);

    doc.moveDown(1.5);

    // ── CHECKLIST ─────────────────────────────────────────────────────────────
    drawSectionHeader('KIỂM TRA TÌNH TRẠNG XE');

    if (checklist.checklist_items.length === 0) {
      doc.fillColor(MID_TEXT).fontSize(9).font('NotoSans-Italic')
        .text('Không có mục nào.', COL_LEFT + 8, doc.y);
      doc.moveDown(0.5);
    } else {
      checklist.checklist_items.forEach((item, idx) => {
        const bg = idx % 2 === 0;
        const y  = doc.y;
        if (bg) doc.rect(COL_LEFT, y, PAGE_WIDTH, ROW_H).fill(LIGHT_GRAY);
        const mark = item.checked ? '[X]' : '[  ]';
        doc
          .fillColor(item.checked ? ACCENT : DARK_TEXT)
          .fontSize(10)
          .font(item.checked ? 'NotoSans-Bold' : 'NotoSans')
          .text(`${mark}  ${item.label}`, COL_LEFT + 8, y + 6, { width: PAGE_WIDTH - 16, lineBreak: false });
        doc.y = y + ROW_H;
      });
    }

    doc.moveDown(1.5);

    // ── GHI CHÚ ───────────────────────────────────────────────────────────────
    drawSectionHeader('GHI CHÚ');
    const noteText = checklist.note?.trim() || '(Không có ghi chú)';
    const noteY = doc.y;
    doc
      .rect(COL_LEFT, noteY, PAGE_WIDTH, 70)
      .stroke('#E0E0E0');
    doc
      .fillColor(DARK_TEXT)
      .fontSize(10)
      .font('NotoSans')
      .text(noteText, COL_LEFT + 8, noteY + 8, {
        width : PAGE_WIDTH - 16,
        height: 54,
      });
    doc.y = noteY + 70 + 16;

    // ── HÌNH ẢNH HIỆN TRẠNG ──────────────────────────────────────────────────
    if (checklist.images.length > 0) {
      // Check trang đủ không
      if (doc.y > 650) doc.addPage();
      drawSectionHeader('HÌNH ẢNH HIỆN TRẠNG');

      const IMG_W     = 160;
      const IMG_H     = 120;
      const GAP       = 12;
      const PER_ROW   = 3;
      let colIndex    = 0;
      let rowStartY   = doc.y;

      for (const imgData of checklist.images) {
        // imgData là base64 data URI: "data:image/jpeg;base64,..."
        if (doc.y + IMG_H > doc.page.height - 60) {
          doc.addPage();
          rowStartY = doc.y = 60;
          colIndex  = 0;
        }

        const x = COL_LEFT + colIndex * (IMG_W + GAP);
        const y = rowStartY;

        try {
          const base64Match = imgData.match(/^data:(image\/\w+);base64,(.+)$/);
          if (base64Match) {
            const imgBuffer = Buffer.from(base64Match[2], 'base64');
            doc.image(imgBuffer, x, y, { width: IMG_W, height: IMG_H, fit: [IMG_W, IMG_H] });
          } else {
            // Placeholder nếu không phải base64 data URI hợp lệ
            doc.rect(x, y, IMG_W, IMG_H).stroke('#BDBDBD');
            doc.fillColor(MID_TEXT).fontSize(8)
              .text('[Ảnh không hợp lệ]', x + 10, y + IMG_H / 2 - 8, { width: IMG_W - 20 });
          }
        } catch {
          doc.rect(x, y, IMG_W, IMG_H).stroke('#BDBDBD');
        }

        colIndex++;
        if (colIndex >= PER_ROW) {
          colIndex   = 0;
          rowStartY += IMG_H + GAP;
          doc.y      = rowStartY;
        }
      }

      // Reset y sau ảnh
      doc.y = rowStartY + IMG_H + GAP;
      doc.moveDown(1);
    }

    // ── CHỮ KÝ KHÁCH HÀNG ────────────────────────────────────────────────────
    if (checklist.customer_signature) {
      if (doc.y > 620) doc.addPage();
      drawSectionHeader('CHỮ KÝ XÁC NHẬN CỦA KHÁCH HÀNG');

      const sigBoxY = doc.y;
      const SIG_W   = 280;
      const SIG_H   = 120;

      try {
        // customer_signature là data URI: "data:image/png;base64,..."
        const base64Data = checklist.customer_signature.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        const sigBuffer = Buffer.from(base64Data, 'base64');
        doc.image(sigBuffer, COL_LEFT, sigBoxY, { width: SIG_W, height: SIG_H, fit: [SIG_W, SIG_H] });
      } catch {
        doc.rect(COL_LEFT, sigBoxY, SIG_W, SIG_H).stroke('#BDBDBD');
        doc.fillColor(MID_TEXT).fontSize(9)
          .text('(Không thể hiển thị chữ ký)', COL_LEFT + 8, sigBoxY + SIG_H / 2 - 8);
      }

      doc.y = sigBoxY + SIG_H + 16;

      doc
        .fillColor(MID_TEXT)
        .fontSize(9)
        .font('NotoSans')
        .text('Khách hàng xác nhận tình trạng xe như trên là đúng sự thật.', COL_LEFT);
    }

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const FOOTER_Y = doc.page.height - 50;
    doc
      .moveTo(COL_LEFT, FOOTER_Y)
      .lineTo(COL_LEFT + PAGE_WIDTH, FOOTER_Y)
      .stroke('#E0E0E0');

    doc
      .fillColor(MID_TEXT)
      .fontSize(8)
      .font('NotoSans')
      .text(
        `Biên bản được tạo lúc: ${createdAt}   |   Hybrid Wash System`,
        COL_LEFT,
        FOOTER_Y + 6,
        { align: 'center', width: PAGE_WIDTH },
      );

    doc.end();
  }
}

export const bookingChecklistService = new BookingChecklistService();