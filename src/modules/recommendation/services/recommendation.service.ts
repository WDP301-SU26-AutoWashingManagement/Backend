
import { Types } from 'mongoose';
import { recommendationRepository, IHistoryEntry, IPackageWithServices } from '../repositories/recommendation.repository';
import { bookingService } from '../../booking/services/booking.service';
import { IAvailableSlot } from '../../booking/interfaces/booking.interface';
import { redisClient } from '../../../configs/redis.config';
import { env } from '../../../configs/env.config';
import { logger } from '../../../common/utils/logger';
import { ForbiddenError, NotFoundError } from '../../../common/utils/AppError';
import {
  IApplicablePromotion,
  IBookingRecommendation,
  IGetBookingRecommendation,
  IRecommendedItem,
  ISuggestedCombo,
  RecommendationSource,
} from '../interfaces/recommendation.interface';

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_LIMIT        = 5;
const SLOT_LOOKAHEAD_DAYS  = 3;   // tìm slot trống trong vòng N ngày tới
const LEAST_USED_TOP_N     = 3;   // số service ít dùng nhất được gợi ý
const COMBO_MIN_MATCH      = 2;   // số service trùng tối thiểu để đề xuất combo

// ─── Service ────────────────────────────────────────────────────────────────

export class RecommendationService {
  private readonly repo = recommendationRepository;

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
      let slotStillValid = false;
      if (!cached.suggested_scheduled_at) {
        slotStillValid = true;
      } else if (new Date(cached.suggested_scheduled_at) > new Date()) {
        const checkBranchId = dto.branch_id ?? cached.branch_id;
        if (checkBranchId) {
           try {
             const d = new Date(cached.suggested_scheduled_at);
             const yyyy = d.getFullYear();
             const mm = String(d.getMonth() + 1).padStart(2, '0');
             const dd = String(d.getDate()).padStart(2, '0');
             const dateStr = `${yyyy}-${mm}-${dd}`;
             
             const avail = await bookingService.getAvailableSlots(checkBranchId, {
               date: dateStr,
               service_ids: cached.recommended_items.map((i: any) => i.service_id)
             });
             
             if (avail.some((s: any) => s.scheduled_at === cached.suggested_scheduled_at)) {
               slotStillValid = true;
             }
           } catch (e) {
             slotStillValid = false;
           }
        }
      }

      if (slotStillValid) return cached;
      
      // Slot đã qua hoặc không còn khả dụng (đổi giờ/đã full): refresh slot, KHÔNG re-run toàn bộ pipeline
      const branchId = dto.branch_id ?? cached.branch_id;
      if (branchId) {
         const newSlot = await this.findOptimalSlot(branchId, cached.recommended_items);
         cached.suggested_scheduled_at = newSlot;
         cached.generated_at = new Date().toISOString();
         await this.writeCache(cacheKey, cached);
      }
      return cached;
    }

    // ── 1. Chọn TOP_N service ít dùng nhất (thuật toán, không AI) ──
    const recommendedItems = await this.pickLeastUsedServices();
    const estimatedTotal   = recommendedItems.reduce((sum, item) => sum + item.price, 0);

    // ── 1.5. Nếu >=2 service trong recommendedItems cùng nằm trong 1 combo/package active → đề xuất combo đó ──
    const suggestedCombo = await this.findComboSuggestion(recommendedItems);

    // ── 2. Tự động chọn promotion tốt nhất mà đơn hàng đủ điều kiện áp dụng ──
    const promotions  = await this.repo.findActivePromotions();
    const promotionId = this.pickBestPromotion(promotions, estimatedTotal);
    const applicablePromotion = this.toApplicablePromotion(promotionId, promotions);

    // ── 3. Chọn branch (ưu tiên branch khách hay dùng nhất) + tìm slot tối ưu (giữ nguyên thuật toán) ──
    const history   = await this.repo.findRecentHistory(dto.vehicle_id, HISTORY_LIMIT);
    const branchId  = dto.branch_id ?? this.pickMostUsedBranch(history);
    const suggestedScheduledAt = branchId
      ? await this.findOptimalSlot(branchId, recommendedItems)
      : null;

    const source: RecommendationSource = 'algorithm';
    let reason = recommendedItems.length
      ? `Đây là ${recommendedItems.length} dịch vụ đang có nhiều khách sử dụng nhất gần đây`
      : 'Hiện chưa có dịch vụ nào khả dụng để gợi ý.';
    if (suggestedCombo) {
      reason += `. Trong đó có ${suggestedCombo.matched_service_ids.length} dịch vụ nằm trong gói "${suggestedCombo.package_name}" (giảm ${suggestedCombo.discount_percentage}%), đặt combo sẽ tiết kiệm hơn`;
    }

    const result: IBookingRecommendation = {
      vehicle_id              : dto.vehicle_id,
      branch_id               : branchId,
      recommended_items       : recommendedItems,
      reason,
      applicable_promotion_id : promotionId,
      applicable_promotion    : applicablePromotion,
      suggested_combo          : suggestedCombo,
      estimated_total         : estimatedTotal,
      suggested_scheduled_at  : suggestedScheduledAt,
      source,
      generated_at            : new Date().toISOString(),
    };

    await this.writeCache(cacheKey, result);
    return result;
  }

  // ─── Ranking helpers (thuật toán, không AI) ────────────────────────────────

  /**
   * Chọn TOP_N service ACTIVE có lượng sử dụng (số booking không bị hủy) THẤP NHẤT.
   * Service chưa từng được đặt (không xuất hiện trong usage map) mặc định count = 0
   * → được ưu tiên gợi ý cao nhất.
   */
  private async pickLeastUsedServices(): Promise<IRecommendedItem[]> {
    const [services, usageMap] = await Promise.all([
      this.repo.findActiveServices(),
      this.repo.findServiceUsageCounts(),
    ]);
    if (!services.length) throw new NotFoundError('No active service available to recommend');

    const ranked = services
      .map((s: any) => ({
        service_id        : s._id.toString(),
        service_package_id: null as string | null,
        name               : s.service_name,
        price              : s.service_price,
        duration_minutes   : s.duration_minutes,
        usageCount         : usageMap.get(s._id.toString()) ?? 0,
      }))
      .sort((a, b) => a.usageCount - b.usageCount) // ít dùng nhất lên đầu
      .slice(0, LEAST_USED_TOP_N);

    // Bỏ field usageCount trước khi trả ra ngoài (không thuộc IRecommendedItem)
    return ranked.map(({ usageCount, ...item }) => item);
  }

  /**
   * Nếu có >=COMBO_MIN_MATCH service trong `items` cùng nằm trong 1 package/combo đang active
   * → đề xuất combo đó (package match nhiều service nhất được ưu tiên, hòa thì ưu tiên discount cao hơn).
   * Không throw, trả null nếu không có combo nào phù hợp.
   */
  private async findComboSuggestion(items: IRecommendedItem[]): Promise<ISuggestedCombo | null> {
    if (items.length < COMBO_MIN_MATCH) return null;
 
    const packages = await this.repo.findActivePackagesWithServices();
    if (!packages.length) return null;
 
    const itemsByServiceId = new Map(items.map((i) => [i.service_id, i]));
 
    let bestPackage    : IPackageWithServices | null = null;
    let bestMatchedIds : string[] = [];
 
    for (const pkg of packages) {
      const matchedIds = pkg.service_ids.filter((sid) => itemsByServiceId.has(sid));
      if (matchedIds.length < COMBO_MIN_MATCH) continue;
 
      const isBetter =
        !bestPackage ||
        matchedIds.length > bestMatchedIds.length ||
        (matchedIds.length === bestMatchedIds.length &&
          pkg.package_discount_percentage > bestPackage.package_discount_percentage);
 
      if (isBetter) {
        bestPackage    = pkg;
        bestMatchedIds = matchedIds;
      }
    }
 
    if (!bestPackage) return null;
 
    const matchedItems  = bestMatchedIds.map((sid) => itemsByServiceId.get(sid)!);
    const originalPrice = matchedItems.reduce((sum, i) => sum + i.price, 0);
    const discountedPrice = Math.round(
      originalPrice * (1 - bestPackage.package_discount_percentage / 100),
    );
 
    return {
      package_id           : bestPackage.package_id,
      package_name         : bestPackage.package_name,
      discount_percentage  : bestPackage.package_discount_percentage,
      matched_service_ids  : bestMatchedIds,
      original_price       : originalPrice,
      discounted_price     : discountedPrice,
    };
  }
 
  /** Tự động chọn promotion đang active có mức giảm cao nhất mà đơn hàng đủ điều kiện áp dụng (min_order_amount). */
  private pickBestPromotion(promotions: any[], estimatedTotal: number): string | null {
    const eligible = promotions.filter((p: any) => (p.min_order_amount ?? 0) <= estimatedTotal);
    if (!eligible.length) return null;

    const best = eligible.reduce((a: any, b: any) => {
      const aVal = a.discount_percentage ?? 0;
      const bVal = b.discount_percentage ?? 0;
      if (bVal !== aVal) return bVal > aVal ? b : a;
      return (b.discount_amount ?? 0) > (a.discount_amount ?? 0) ? b : a;
    });

    return best._id.toString();
  }

  /** Tra full thông tin promotion từ mảng đã fetch sẵn — không query DB thêm lần nào. */
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

  /**
   * Tìm slot tối ưu theo thuật toán load balancing (GIỮ NGUYÊN, không đổi):
   *
   * 1. Lấy available slots từng ngày (trong SLOT_LOOKAHEAD_DAYS ngày tới).
   * 2. Tính congestion score dựa trên lịch sử 7 ngày của branch.
   * 3. Chọn Top 3 slot ít đông nhất.
   * 4. Phân phối khách đều bằng Round Robin (Redis counter per branch).
   * 5. Validate slot được chọn còn nhân viên hợp lệ (check song song).
   * 6. Nếu không hợp lệ, fallback sang slot gần nhất (ưu tiên về sau).
   *
   * KHÔNG BAO GIỜ throw, luôn trả null nếu thất bại.
   */
  private async findOptimalSlot(
    branchId : string,
    items    : IRecommendedItem[],
  ): Promise<string | null> {
    const serviceIds = items.map((i) => i.service_id);

    // ── Lần lượt tìm qua từng ngày ──────────────────────────────────────────
    for (let dayOffset = 0; dayOffset < SLOT_LOOKAHEAD_DAYS; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);

      const yyyy    = date.getFullYear();
      const mm      = String(date.getMonth() + 1).padStart(2, '0');
      const dd      = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      let availableSlots: IAvailableSlot[];
      try {
        availableSlots = await bookingService.getAvailableSlots(branchId, {
          date        : dateStr,
          service_ids : serviceIds,
        });
      } catch (err: any) {
        logger.warn(`[recommendation] getAvailableSlots failed for branch ${branchId} on ${dateStr}`, err?.message);
        continue;
      }

      if (!availableSlots.length) continue;

      // ── Validate: slot phải sau hiện tại ít nhất 1 tiếng ────────────────
      const oneHourFromNow = Date.now() + 60 * 60 * 1000;
      const validSlots = availableSlots.filter(
        (s) => new Date(s.scheduled_at).getTime() >= oneHourFromNow,
      );
      if (!validSlots.length) continue;

      // ── Bước 2–3: Lấy congestion map 7 ngày trước ───────────────────────
      const bookingDate     = new Date(`${dateStr}T00:00:00+07:00`);
      const congestionMap   = await this.repo.findSlotCongestionMap(branchId, bookingDate);

      // ── Bước 4–5: Tính score cho từng slot khả dụng ─────────────────────
      const scoredSlots = validSlots.map((s) => {
        const slotTime = new Date(s.scheduled_at)
          .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
        const count    = congestionMap.get(slotTime) ?? 0;
        return { slot: s, slotTime, count };
      });

      // maxBookingCount trong window (tránh chia cho 0)
      const maxCount = Math.max(...scoredSlots.map((s) => s.count), 1);

      const withScore = scoredSlots.map((s) => ({
        ...s,
        congestionScore: s.count / maxCount,
      }));

      // ── Bước 6–7: Sort tăng dần, lấy Top 3 ─────────────────────────────
      const top3 = [...withScore]
        .sort((a, b) => a.congestionScore - b.congestionScore)
        .slice(0, 3);

      if (!top3.length) continue;

      // ── Bước 8: Round Robin phân phối khách giữa Top 3 ──────────────────
      // Dùng Redis counter per branch — nếu Redis lỗi thì random chọn 1 trong top3
      let pickedIndex = 0;
      const rrKey = `reco:rr:${branchId}`;
      try {
        const counter = await redisClient.incr(rrKey);
        // TTL 24h để counter reset mỗi ngày
        await redisClient.expire(rrKey, 86_400);
        pickedIndex = (Number(counter) - 1) % top3.length;
      } catch {
        pickedIndex = Math.floor(Math.random() * top3.length);
      }

      const primaryCandidate = top3[pickedIndex];

      // ── Bước 9–10: Validate staff + fallback sang slot gần nhất ─────────
      // Check song song tất cả candidate thay vì await tuần tự từng cái (giảm cộng dồn latency),
      // nhưng vẫn giữ đúng thứ tự ưu tiên khi chọn kết quả cuối cùng.
      const allCandidates = this.buildFallbackOrder(primaryCandidate, top3, withScore);

      const staffChecks = await Promise.all(
        allCandidates.map(async (candidate) => {
          const slotDate = new Date(candidate.slot.scheduled_at);
          try {
            return await this.repo.hasAvailableStaffForSlot(branchId, slotDate, serviceIds);
          } catch (err: any) {
            logger.warn(`[recommendation] hasAvailableStaffForSlot failed for slot ${candidate.slot.scheduled_at}`, err?.message);
            return false;
          }
        }),
      );

      const firstValidIndex = staffChecks.findIndex((hasStaff) => hasStaff);
      if (firstValidIndex !== -1) return allCandidates[firstValidIndex].slot.scheduled_at;
      // Không có slot nào có staff → thử ngày tiếp theo
    }

    return null;
  }

  /**
   * Xây dựng thứ tự fallback:
   * [primary, ...slots sau primary theo thời gian, ...slots trước primary theo thời gian ngược]
   * Ưu tiên dịch về phía sau trước, sau đó mới xét các slot sớm hơn.
   */
  private buildFallbackOrder(
    primary   : { slot: IAvailableSlot; congestionScore: number },
    top3      : { slot: IAvailableSlot; congestionScore: number }[],
    allScored : { slot: IAvailableSlot; congestionScore: number }[],
  ): { slot: IAvailableSlot; congestionScore: number }[] {
    const primaryTime = new Date(primary.slot.scheduled_at).getTime();

    // Tất cả slot sau primary (sort tăng dần)
    const after  = allScored
      .filter((s) => new Date(s.slot.scheduled_at).getTime() > primaryTime)
      .sort((a, b) => new Date(a.slot.scheduled_at).getTime() - new Date(b.slot.scheduled_at).getTime());

    // Tất cả slot trước primary (sort giảm dần — gần primary nhất trước)
    const before = allScored
      .filter((s) => new Date(s.slot.scheduled_at).getTime() < primaryTime)
      .sort((a, b) => new Date(b.slot.scheduled_at).getTime() - new Date(a.slot.scheduled_at).getTime());

    return [primary, ...after, ...before];
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
 

