/** 构建时默认网关；用户可以在设置中覆盖。 */
export const DEFAULT_API_ORIGIN = __API_ORIGIN__

/** 去掉末尾斜杠，保留可选的网关路径前缀。 */
export const normalizeApiOrigin = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  try {
    const url = new URL(trimmed)
    const localHttp =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]')
    if (
      (url.protocol !== 'https:' && !localHttp) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    return null
  }
}
