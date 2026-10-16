/** 从 Web Storage 安全读取 JSON；空值、历史 undefined 和损坏内容统一回退 null。 */
export function readStoredJson<T>(storage: Pick<Storage, 'getItem'>, key: string): T | null {
  const raw = storage.getItem(key)
  if (!raw || raw === 'undefined') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
