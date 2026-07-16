import { env } from '../../configs/env.config';
import { logger } from './logger';

/**
 * Mỏng nhẹ, gọi thẳng Gemini REST API (free tier) bằng global fetch (Node >= 18).
 * Không dùng SDK để giữ dependency tối thiểu.
 *
 * Mọi hàm ở đây KHÔNG throw — trả về null khi lỗi/thiếu API key/hết quota,
 * để các luồng nghiệp vụ chính (booking) không bao giờ bị sập vì AI feature.
 */

// ─── Embeddings ─────────────────────────────────────────────────────────────

/**
 * Embed 1 đoạn text thành vector số (dùng cho semantic search/RAG retrieval).
 * Model mặc định: text-embedding-004 (free tier).
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (!env.GEMINI_API_KEY) {
    logger.warn('[gemini] GEMINI_API_KEY chưa được cấu hình — bỏ qua embedding');
    return null;
  }
  if (!text?.trim()) return null;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), env.GEMINI_TIMEOUT_MS);

  try {
    const url = `${env.GEMINI_API_BASE}/models/${env.GEMINI_EMBEDDING_MODEL}:embedContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${env.GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.error(`[gemini] embedText failed: ${res.status} ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as any;
    const values = data?.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch (err: any) {
    // AbortError (mạng lag/quá timeout) cũng rơi vào đây → trả null, caller đã có fallback sẵn.
    logger.error(`[gemini] embedText error${err?.name === 'AbortError' ? ` (timeout ${env.GEMINI_TIMEOUT_MS}ms)` : ''}`, err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Structured generation ──────────────────────────────────────────────────

/**
 * Gọi Gemini generateContent, ép trả JSON theo responseSchema (OpenAPI-subset).
 * Trả về object đã parse, hoặc null nếu lỗi/parse fail — caller PHẢI có fallback.
 */
export async function generateStructuredContent<T = Record<string, unknown>>(
  prompt: string,
  responseSchema: Record<string, unknown>,
): Promise<T | null> {
  if (!env.GEMINI_API_KEY) {
    logger.warn('[gemini] GEMINI_API_KEY chưa được cấu hình — bỏ qua generation');
    return null;
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), env.GEMINI_TIMEOUT_MS);

  try {
    const url = `${env.GEMINI_API_BASE}/models/${env.GEMINI_GENERATION_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.4,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.error(`[gemini] generateStructuredContent failed: ${res.status} ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as any;
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText) as T;
  } catch (err: any) {
    logger.error(`[gemini] generateStructuredContent error${err?.name === 'AbortError' ? ` (timeout ${env.GEMINI_TIMEOUT_MS}ms)` : ''}`, err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
