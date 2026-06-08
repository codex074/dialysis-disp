// พอร์ตจาก index.html getPaginationData()
export const PAGE_SIZE = 10

export interface Pagination<T> {
  page: number
  totalPages: number
  totalItems: number
  items: T[]
  start: number
  end: number
}

export function getPaginationData<T>(items: T[], page: number, pageSize = PAGE_SIZE): Pagination<T> {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    page: safePage,
    totalPages,
    totalItems,
    items: items.slice(start, start + pageSize),
    start: totalItems === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, totalItems),
  }
}
