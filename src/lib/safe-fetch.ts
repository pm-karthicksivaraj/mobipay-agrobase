/**
 * Safe API fetch helper — handles 401/403/500 gracefully.
 * Returns null on any error instead of crashing the component.
 */
export async function safeFetch(url: string): Promise<any | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[safeFetch] ${url} returned ${res.status}`)
      return null
    }
    const text = await res.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      console.warn(`[safeFetch] ${url} returned non-JSON`)
      return null
    }
  } catch (err) {
    console.error(`[safeFetch] ${url} failed:`, err)
    return null
  }
}

/**
 * Extract array from API response — handles multiple response shapes.
 */
export function extractArray(data: any, ...keys: string[]): any[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  for (const key of keys) {
    if (data[key] && Array.isArray(data[key])) return data[key]
  }
  // Check if data itself is an object with an array property
  for (const val of Object.values(data)) {
    if (Array.isArray(val)) return val as any[]
  }
  return []
}
