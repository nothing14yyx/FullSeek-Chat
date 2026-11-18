/** 构建时默认网关；用户可以在设置中覆盖。 */
export const DEFAULT_API_ORIGIN = __API_ORIGIN__
const defaultApiRoot = DEFAULT_API_ORIGIN.replace(/\/+$/, '')
export const DEFAULT_MESSAGES_API_ORIGIN = `${defaultApiRoot}/anthropic`

/** DeepSeek 使用不同的 base URL：Messages 走 Anthropic 兼容入口，Responses 走 API 根地址。 */
export const getDefaultApiOrigin = (protocol: 'messages' | 'responses'): string =>
  protocol === 'messages' ? DEFAULT_MESSAGES_API_ORIGIN : defaultApiRoot

/** 识别应用自带的两个 DeepSeek 默认地址，便于切换协议时同步更新 base URL。 */
export const isDefaultDeepSeekOrigin = (value: string): boolean => {
  const origin = value.replace(/\/+$/, '')
  return origin === defaultApiRoot || origin === DEFAULT_MESSAGES_API_ORIGIN
}

/** Messages 的 ASR/TTS 工具位于 DeepSeek API 根地址，不在 /anthropic 子路径下。 */
export const getApiRootOrigin = (value: string): string => {
  const origin = value.replace(/\/+$/, '')
  return origin === DEFAULT_MESSAGES_API_ORIGIN ? defaultApiRoot : origin
}

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
