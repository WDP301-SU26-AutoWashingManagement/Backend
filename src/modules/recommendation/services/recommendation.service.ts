import { Types } from 'mongoose';
import { recommendationRepository, IHistoryEntry } from '../repositories/recommendation.repository';
import { bookingService } from '../../booking/services/booking.service';
import { Service } from '../../../models/service.model';
import { ServicePackage } from '../../../models/servicePackage.model';
import { redisClient } from '../../../configs/redis.config';
import { env } from '../../../configs/env.config';
import { embedText, generateStructuredContent } from '../../../common/utils/gemini.client';
import { cosineSimilarity } from '../../../common/utils/vector.util';
import { logger } from '../../../common/utils/logger';
import { ForbiddenError, NotFoundError } from '../../../common/utils/AppError';
import {
  IApplicablePromotion,
  IBookingRecommendation,
  ICandidateItem,
  IGeminiRecommendationDraft,
  IGetBookingRecommendation,
  IRecommendedItem,
  RecommendationSource,
} from '../interfaces/recommendation.interface';

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_LIMIT        = 5;
const CANDIDATE_TOP_K       = 8;   // số ứng viên gửi cho Gemini lựa chọn
const SLOT_LOOKAHEAD_DAYS   = 3;   // tìm slot trống trong vòng N ngày tới

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recommended_package_id : { type: 'STRING', description: 'id of the best ServicePackage candidate to recommend, or "" if no package fits well' },
    recommended_service_ids: {
      type : 'ARRAY',
      items: { type: 'STRING' },
      description: 'up to 3 individual Service candidate ids to recommend, only used when no package fits well',
    },
    promotion_id: { type: 'STRING', description: 'id of the best matching active promotion to apply, or "" if none applies' },
    reason      : { type: 'STRING', description: 'short reason written in Vietnamese, max 2 sentences, talking directly to the customer' },
  },
  required: ['reason'],
};

// ─── Service ────────────────────────────────────────────────────────────────

export class RecommendationService {
  private readonly repo = recommendationRepository;

  /**
   * "Auto-Pilot Booking" — gợi ý gói/dịch vụ + khung giờ phù hợp nhất cho 1 xe,
   * để render thẳng thành 1 card pre-filled trong flow tạo booking (không phải chatbot).
   *
   * Luồng: retrieve (vehicle/customer/history/catalog) → rank theo embedding (RAG)
   * → Gemini chọn lựa chọn tốt nhất + sinh lý do → validate lại id (chống hallucination)
   * → nếu AI lỗi/không hợp lệ thì fallback theo điểm similarity, KHÔNG BAO GIỜ throw vì lỗi AI.
   */
  async getBookingRecommendation(
    userId: string,
    dto: IGetBookingRecommendation,
  ): Promise<IBookingRecommendation> {
    const customer = await this.repo.findCustomerWithTier(userId);
    if (!customer) throw new NotFoundError('Customer profile not found');

    const vehicle = await this.repo.findVehicleWithClass(dto.vehicle_id);
    if (!vehicle) throw new NotFoundError('Vehicle not found');
    if (vehicle.customer_id.toString() !== (customer._id as Types.ObjectId).toString()) {
      throw new ForbiddenError('Vehicle does not belong to this customer');
    }

    const cacheKey = `reco:${customer._id}:${dto.vehicle_id}:${dto.branch_id ?? 'auto'}`;
    const cached = await this.readCache(cacheKey);
    if (cached) {
      // Nếu suggested_scheduled_at đã qua → cache stale, bỏ qua và tính lại slot mới.
      const slotStillValid =
        !cached.suggested_scheduled_at ||
        new Date(cached.suggested_scheduled_at) > new Date();
      if (slotStillValid) return cached;
      // Slot đã qua: xóa cache cũ, tiếp tục tính lại (chỉ cần refresh slot, không cần re-run toàn bộ RAG)
      await this.deleteCache(cacheKey);
    }

    const history = await this.repo.findRecentHistory(dto.vehicle_id, HISTORY_LIMIT);

    // ── 1. Build candidate pool (retrieval corpus) ──
    const candidates = await this.buildCandidatePool();
    if (!candidates.length) throw new NotFoundError('No active service available to recommend');
    await this.ensureCandidateEmbeddings(candidates);

    // ── 2. Semantic ranking (RAG retrieval step) ──
    const contextText   = this.buildContextText(vehicle, customer, history);
    const contextVector = await embedText(contextText);

    let ranked = candidates;
    if (contextVector) {
      candidates.forEach((c) => {
        c.score = cosineSimilarity(contextVector, c.embedding);
      });
      ranked = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    const topCandidates = ranked.slice(0, CANDIDATE_TOP_K);

    // ── 3. Generation step (Gemini chọn + giải thích) ──
    const promotions = await this.repo.findActivePromotions();
    const draft = await this.askGeminiToChoose(contextText, topCandidates, promotions);

    // ── 4. Validate AI output, fallback nếu cần ──
    const { chosen, chosenServiceIds, reason, promotionId, source } = this.resolveChoice(
      draft,
      topCandidates,
      ranked,
      promotions,
      vehicle,
    );

    // ── 5. Build response payload (sẵn sàng nhét thẳng vào POST /bookings) ──
    const recommendedItems = await this.buildRecommendedItems(chosen, chosenServiceIds);
    const estimatedTotal   = recommendedItems.reduce((sum, item) => sum + item.price, 0);

    const branchId = dto.branch_id ?? this.pickMostUsedBranch(history);
    const suggestedScheduledAt = branchId
      ? await this.findEarliestSlot(branchId, recommendedItems)
      : null;

    const applicablePromotion = this.toApplicablePromotion(promotionId, promotions);

    const result: IBookingRecommendation = {
      vehicle_id              : dto.vehicle_id,
      branch_id               : branchId,
      recommended_items       : recommendedItems,
      reason,
      applicable_promotion_id : promotionId,
      applicable_promotion    : applicablePromotion,
      estimated_total         : estimatedTotal,
      suggested_scheduled_at  : suggestedScheduledAt,
      source,
      generated_at            : new Date().toISOString(),
    };

    await this.writeCache(cacheKey, result);
    return result;
  }

  // ─── Retrieval helpers ──────────────────────────────────────────────────

  private async buildCandidatePool(): Promise<ICandidateItem[]> {
    const [services, packages] = await Promise.all([
      this.repo.findActiveServices(),
      this.repo.findActivePackages(),
    ]);

    const serviceCandidates: ICandidateItem[] = services.map((s: any) => ({
      id               : s._id.toString(),
      kind             : 'service',
      name             : s.service_name,
      description      : s.description ?? '',
      price            : s.service_price,
      duration_minutes : s.duration_minutes,
      service_ids      : [s._id.toString()],
      embedding        : s.embedding ?? [],
    }));

    const packageLinksByPackage = await Promise.all(
      packages.map((p: any) => this.repo.findServicesInPackage(p._id.toString())),
    );

    const packageCandidates: ICandidateItem[] = [];
    packages.forEach((p: any, idx: number) => {
      const links = (packageLinksByPackage[idx] as any[]).filter((l) => l.service_id?.is_active);
      if (!links.length) return; // gói rỗng/toàn service inactive — bỏ qua, không đề xuất được

      const discountRate = (p.package_discount_percentage ?? 0) / 100;
      const price    = links.reduce((sum, l) => sum + Math.round(l.service_id.service_price * (1 - discountRate)), 0);
      const duration = links.reduce((sum, l) => sum + l.service_id.duration_minutes, 0);

      packageCandidates.push({
        id                  : p._id.toString(),
        kind                : 'package',
        name                : p.package_name,
        description         : p.description ?? '',
        price,
        duration_minutes    : duration,
        discount_percentage : p.package_discount_percentage,
        service_ids         : links.map((l) => l.service_id._id.toString()),
        embedding           : p.embedding ?? [],
      });
    });

    return [...packageCandidates, ...serviceCandidates];
  }

  /** Lazy-embed các candidate chưa có vector sẵn, rồi persist lại vào DB để lần sau khỏi tốn quota. */
  private async ensureCandidateEmbeddings(candidates: ICandidateItem[]): Promise<void> {
    const missing = candidates.filter((c) => !c.embedding?.length);
    if (!missing.length) return;

    await Promise.all(
      missing.map(async (c) => {
        const sourceText = `${c.kind === 'package' ? 'Gói dịch vụ' : 'Dịch vụ'}: ${c.name}. ${c.description}`.trim();
        const vector = await embedText(sourceText);
        if (!vector) return; // không có API key / lỗi mạng — candidate này sẽ không tham gia ranking, vẫn an toàn

        c.embedding = vector;
        try {
          if (c.kind === 'package') {
            await ServicePackage.updateOne({ _id: c.id }, { $set: { embedding: vector } }).exec();
          } else {
            await Service.updateOne({ _id: c.id }, { $set: { embedding: vector } }).exec();
          }
        } catch (err) {
          logger.warn(`[recommendation] persist embedding failed for ${c.kind} ${c.id}`, err);
        }
      }),
    );
  }

  private buildContextText(vehicle: any, customer: any, history: IHistoryEntry[]): string {
    const vehicleClassName = (vehicle.vehicle_class_id as any)?.class_name ?? 'không rõ phân khúc';
    const vehicleDesc = `Xe ${vehicle.vehicle_model}, phân khúc ${vehicleClassName}, màu ${vehicle.color}, nhiên liệu ${vehicle.fuel_type}.`;

    const tier = customer.tier_id as any;
    const tierDesc = tier?.tier_name ? `Khách hàng đang ở hạng thành viên ${tier.tier_name}.` : '';

    let historyDesc: string;
    if (!history.length) {
      historyDesc = 'Khách hàng chưa có lịch sử rửa xe nào trước đó với xe này.';
    } else {
      const daysSinceLast = Math.floor(
        (Date.now() - new Date(history[0].scheduled_at).getTime()) / 86_400_000,
      );
      const lines = history.map((h) => {
        const d = new Date(h.scheduled_at).toISOString().slice(0, 10);
        return `${d}: ${h.services.length ? h.services.join(', ') : 'không rõ dịch vụ'}`;
      });
      historyDesc = `Lần rửa xe gần nhất cách đây ${daysSinceLast} ngày. Lịch sử gần đây: ${lines.join(' | ')}.`;
    }

    return [vehicleDesc, tierDesc, historyDesc].filter(Boolean).join(' ');
  }

  // ─── Generation helpers ─────────────────────────────────────────────────

  private async askGeminiToChoose(
    contextText: string,
    topCandidates: ICandidateItem[],
    promotions: any[],
  ): Promise<IGeminiRecommendationDraft | null> {
    const candidateListText = topCandidates
      .map((c) => {
        const priceTag = c.kind === 'package' ? `discount=${c.discount_percentage ?? 0}%` : `duration=${c.duration_minutes} phút`;
        const descTag  = c.description ? ` mô_tả="${c.description}"` : '';
        return `- id="${c.id}" type=${c.kind} name="${c.name}" price=${c.price}đ ${priceTag}${descTag}`;
      })
      .join('\n');

    const promotionListText = promotions.length
      ? promotions
          .map((p: any) => `- id="${p._id}" code=${p.code} loại=${p.type} giảm=${p.discount_percentage ?? p.discount_amount ?? 0} đơn_tối_thiểu=${p.min_order_amount}đ`)
          .join('\n')
      : '(không có khuyến mãi nào đang hoạt động)';

    const prompt = `Bạn là trợ lý gợi ý dịch vụ cho hệ thống đặt lịch rửa xe AutoWash.
Dựa trên thông tin khách hàng dưới đây, hãy chọn ra lựa chọn phù hợp NHẤT từ danh sách ứng viên.

Thông tin khách hàng:
${contextText}

Danh sách dịch vụ/gói ứng viên (CHỈ được chọn id có trong danh sách này):
${candidateListText}

Danh sách khuyến mãi đang hoạt động (CHỈ được chọn id có trong danh sách này, hoặc để trống "" nếu không phù hợp):
${promotionListText}

Yêu cầu:
- Ưu tiên chọn 1 gói (package) nếu có gói phù hợp hơn dịch vụ lẻ rời rạc.
- Nếu không có gói nào phù hợp, chọn tối đa 3 dịch vụ lẻ trong recommended_service_ids.
- Tuyệt đối không tự bịa ra id ngoài 2 danh sách trên.
- reason viết bằng tiếng Việt, tối đa 2 câu, nói trực tiếp với khách hàng (ví dụ: "Xe của bạn nên...").`;

    return generateStructuredContent<IGeminiRecommendationDraft>(prompt, RESPONSE_SCHEMA);
  }

  /** Validate lựa chọn của Gemini với tập id thật; nếu hallucination/lỗi → fallback theo similarity score. */
  private resolveChoice(
    draft: IGeminiRecommendationDraft | null,
    topCandidates: ICandidateItem[],
    ranked: ICandidateItem[],
    promotions: any[],
    vehicle: any,
  ): {
    chosen: ICandidateItem | null;
    chosenServiceIds: string[] | null;
    reason: string;
    promotionId: string | null;
    source: RecommendationSource;
  } {
    const topById       = new Map(topCandidates.map((c) => [c.id, c]));
    const promotionById = new Set(promotions.map((p: any) => p._id.toString()));

    let chosen: ICandidateItem | null = null;
    let chosenServiceIds: string[] | null = null;
    let promotionId: string | null = null;
    let reason = '';
    let source: RecommendationSource = 'fallback';

    if (draft) {
      const pkgId = draft.recommended_package_id?.trim();
      const candPkg = pkgId ? topById.get(pkgId) : undefined;

      if (candPkg?.kind === 'package') {
        chosen = candPkg;
        source = 'ai';
      } else if (draft.recommended_service_ids?.length) {
        const validIds = draft.recommended_service_ids.filter(
          (id) => topById.get(id)?.kind === 'service',
        );
        if (validIds.length) {
          chosenServiceIds = validIds.slice(0, 3);
          source = 'ai';
        }
      }

      if (draft.promotion_id && promotionById.has(draft.promotion_id)) {
        promotionId = draft.promotion_id;
      }

      if (source === 'ai' && draft.reason?.trim()) {
        reason = draft.reason.trim();
      }
    }

    // Fallback: Gemini lỗi / hết quota / chọn id không hợp lệ → dùng candidate top similarity.
    if (!chosen && !chosenServiceIds) {
      const top = ranked[0];
      if (!top) throw new NotFoundError('No active service available to recommend');

      if (top.kind === 'package') {
        chosen = top;
      } else {
        chosenServiceIds = [top.id];
      }
      source = 'fallback';
      reason = `Dựa trên loại xe ${vehicle.vehicle_model} và lịch sử sử dụng gần đây, đây là lựa chọn phù hợp nhất hiện có.`;
    }

    return { chosen, chosenServiceIds, reason, promotionId, source };
  }

  /** Tra full thông tin promotion từ mảng đã fetch sẵn ở bước 3 — không query DB thêm lần nào. */
  private toApplicablePromotion(
    promotionId: string | null,
    promotions: any[],
  ): IApplicablePromotion | null {
    if (!promotionId) return null;

    const promo = promotions.find((p: any) => p._id.toString() === promotionId);
    if (!promo) return null;

    return {
      id                  : promo._id.toString(),
      promotion_name      : promo.promotion_name,
      code                : promo.code,
      type                : promo.type,
      discount_percentage : promo.discount_percentage,
      discount_amount     : promo.discount_amount,
      min_order_amount    : promo.min_order_amount,
    };
  }

  // ─── Response-building helpers ──────────────────────────────────────────

  private async buildRecommendedItems(
    chosen: ICandidateItem | null,
    chosenServiceIds: string[] | null,
  ): Promise<IRecommendedItem[]> {
    if (chosen) {
      const links = await this.repo.findServicesInPackage(chosen.id);
      const discountRate = (chosen.discount_percentage ?? 0) / 100;

      return (links as any[])
        .filter((l) => l.service_id?.is_active)
        .map((l) => ({
          service_id        : l.service_id._id.toString(),
          service_package_id: chosen.id,
          name               : l.service_id.service_name,
          price              : Math.round(l.service_id.service_price * (1 - discountRate)),
          duration_minutes   : l.service_id.duration_minutes,
        }));
    }

    if (chosenServiceIds) {
      const services = await Service.find({ _id: { $in: chosenServiceIds } }).lean();
      return services.map((s: any) => ({
        service_id        : s._id.toString(),
        service_package_id: null,
        name               : s.service_name,
        price              : s.service_price,
        duration_minutes   : s.duration_minutes,
      }));
    }

    return [];
  }

  private pickMostUsedBranch(history: IHistoryEntry[]): string | null {
    const counts = new Map<string, number>();
    for (const h of history) {
      if (h.branch_id) counts.set(h.branch_id, (counts.get(h.branch_id) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }

  private async findEarliestSlot(branchId: string, items: IRecommendedItem[]): Promise<string | null> {
    const serviceIds = items.map((i) => i.service_id);

    for (let dayOffset = 0; dayOffset < SLOT_LOOKAHEAD_DAYS; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      
      // Khắc phục lỗi UTC: Lấy chuẩn ngày giờ địa phương (Local Time)
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      try {
        const slots = await bookingService.getAvailableSlots(branchId, { date: dateStr, service_ids: serviceIds });
        if (slots.length) return slots[0].scheduled_at;
      } catch (err: any) {
        // Bỏ qua lỗi (vd: lệch múi giờ quá khứ) và thử tiếp ngày mai thay vì return null tắt hoàn toàn chức năng
        logger.warn(`[recommendation] getAvailableSlots failed for branch ${branchId} on ${dateStr}`, err?.message || err);
        continue;
      }
    }

    return null;
  }

  // ─── Cache helpers ───────────────────────────────────────────────────────

  private async readCache(key: string): Promise<IBookingRecommendation | null> {
    try {
      const cached = await redisClient.get(key);
      return cached ? (JSON.parse(cached) as IBookingRecommendation) : null;
    } catch (err) {
      logger.warn('[recommendation] redis cache read failed', err);
      return null;
    }
  }

  private async deleteCache(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (err) {
      logger.warn('[recommendation] redis cache delete failed', err);
    }
  }

  private async writeCache(key: string, value: IBookingRecommendation): Promise<void> {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: env.RECOMMENDATION_CACHE_TTL_SECONDS });
    } catch (err) {
      logger.warn('[recommendation] redis cache write failed', err);
    }
  }
}

export const recommendationService = new RecommendationService();