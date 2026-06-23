/**
 * Cosine similarity giữa 2 vector cùng chiều.
 * Dùng cho semantic retrieval thủ công (không cần vector DB riêng vì
 * catalog service/package quy mô nhỏ — brute-force là đủ nhanh).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
