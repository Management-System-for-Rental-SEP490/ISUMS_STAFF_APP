/** Kích thước trang mặc định cho danh sách dài (client-side). */
export const CLIENT_LIST_PAGE_SIZE = 10;

export function getTotalPages(itemCount: number, pageSize = CLIENT_LIST_PAGE_SIZE): number {
  if (itemCount <= 0) return 1;
  return Math.ceil(itemCount / pageSize);
}

export function slicePage<T>(items: T[], page: number, pageSize = CLIENT_LIST_PAGE_SIZE): T[] {
  const total = getTotalPages(items.length, pageSize);
  const p = Math.min(Math.max(1, Math.floor(page) || 1), total);
  const start = (p - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export type PaginationToken = number | "ellipsis";

/**
 * Chuỗi số trang hiển thị dạng 1 … 4 5 6 … 20 (trang hiện tại ±1, luôn có đầu/cuối).
 */
export function buildPaginationSequence(
  currentPage: number,
  totalPages: number
): PaginationToken[] {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let d = -1; d <= 1; d++) {
    const p = currentPage + d;
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: PaginationToken[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]!);
  }
  return result;
}
