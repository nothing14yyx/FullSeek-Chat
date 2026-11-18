import { create } from 'zustand'
import type { TtsVoice } from './api/speech.js'
import {
  getDefaultApiOrigin,
  isDefaultDeepSeekOrigin,
  normalizeApiOrigin,
} from './api/config.js'
import { normalizeLocation, type UserLocation } from './location.js'

export type Locale = 'zh-CN' | 'en-US'
export type ApiProtocol = 'messages' | 'responses'

/** 主题偏好；默认跟随系统 */
export type ThemePreference = 'light' | 'dark' | 'system'

/** 本机设置，存 localStorage：API Key、语言、主题、位置、朗读音色、深度思考与智能搜索开关、侧边栏收起状态 */
type Settings = {
  apiKey: string | null
  apiOrigin: string
  apiProtocol: ApiProtocol
  messagesModel: string
  responsesModel: string
  locale: Locale
  themePreference: ThemePreference
  location: UserLocation | null
  ttsVoice: TtsVoice
  thinking: boolean
  search: boolean
  siderCollapsed: boolean
}

const KEYS = {
  apiKey: 'chat-demo:api-key',
  apiOrigin: 'chat-demo:api-origin',
  apiProtocol: 'chat-demo:api-protocol',
  messagesModel: 'chat-demo:messages-model',
  responsesModel: 'chat-demo:responses-model',
  locale: 'chat-demo:locale',
  location: 'chat-demo:location',
  themePreference: 'chat-demo:theme-preference',
  ttsVoice: 'chat-demo:tts-voice',
  thinking: 'chat-demo:thinking',
  search: 'chat-demo:search',
  siderCollapsed: 'chat-demo:sider-collapsed',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // 存储不可用时只在内存中生效
  }
}

/** 位置选择模式跟随浏览器语言，与应用内选择的界面语言无关。 */
export const isChineseBrowser = (): boolean =>
  (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return 'zh-CN'
}

const initialLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (!location) {
      return null
    }
    return isChineseBrowser()
      ? location.region === 'CN' && location.province
        ? location
        : null
      : { region: location.region }
  } catch {
    return null
  }
}

/** 未保存过时跟随系统 */
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

/** 未保存过时使用服务端默认音色 stella（海星） */
const initialTtsVoice = (): TtsVoice => (read(KEYS.ttsVoice) === 'tide' ? 'tide' : 'stella')

const initialApiProtocol: ApiProtocol =
  read(KEYS.apiProtocol) === 'responses' ? 'responses' : 'messages'

const initialApiOrigin = (): string => {
  const saved = normalizeApiOrigin(read(KEYS.apiOrigin) ?? '')
  // Migrate prior builds that saved the root URL while using the Messages protocol.
  return !saved || isDefaultDeepSeekOrigin(saved) ? getDefaultApiOrigin(initialApiProtocol) : saved
}

export const useSettings = create<Settings>(() => ({
  apiKey: read(KEYS.apiKey),
  apiOrigin: initialApiOrigin(),
  apiProtocol: initialApiProtocol,
  messagesModel: read(KEYS.messagesModel)?.trim() ?? '',
  responsesModel: read(KEYS.responsesModel)?.trim() ?? '',
  locale: initialLocale(),
  location: initialLocation(),
  themePreference: initialThemePreference(),
  ttsVoice: initialTtsVoice(),
  thinking: read(KEYS.thinking) === 'true',
  search: read(KEYS.search) === 'true',
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
}))

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}

export const setLocation = (value: UserLocation | null) => {
  const location = normalizeLocation(value)
  write(KEYS.location, location ? JSON.stringify(location) : null)
  useSettings.setState({ location })
}

export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}

export const setTtsVoice = (ttsVoice: TtsVoice) => {
  write(KEYS.ttsVoice, ttsVoice)
  useSettings.setState({ ttsVoice })
}

export const setApiKey = (apiKey: string | null) => {
  write(KEYS.apiKey, apiKey)
  useSettings.setState({ apiKey })
}

export const setApiOrigin = (apiOrigin: string) => {
  const normalized = normalizeApiOrigin(apiOrigin)
  if (!normalized) {
    return false
  }
  const protocol = useSettings.getState().apiProtocol
  const resolved = isDefaultDeepSeekOrigin(normalized) ? getDefaultApiOrigin(protocol) : normalized
  write(KEYS.apiOrigin, isDefaultDeepSeekOrigin(resolved) ? null : resolved)
  useSettings.setState({ apiOrigin: resolved })
  return true
}

export const setApiProtocol = (apiProtocol: ApiProtocol) => {
  const currentOrigin = useSettings.getState().apiOrigin
  const apiOrigin = isDefaultDeepSeekOrigin(currentOrigin)
    ? getDefaultApiOrigin(apiProtocol)
    : currentOrigin
  write(KEYS.apiProtocol, apiProtocol)
  write(KEYS.apiOrigin, isDefaultDeepSeekOrigin(apiOrigin) ? null : apiOrigin)
  useSettings.setState({ apiProtocol, apiOrigin })
}

export const setMessagesModel = (messagesModel: string) => {
  const normalized = messagesModel.trim()
  write(KEYS.messagesModel, normalized)
  useSettings.setState({ messagesModel: normalized })
}

export const setResponsesModel = (responsesModel: string) => {
  const normalized = responsesModel.trim()
  write(KEYS.responsesModel, normalized)
  useSettings.setState({ responsesModel: normalized })
}

export const setThinking = (thinking: boolean) => {
  write(KEYS.thinking, String(thinking))
  useSettings.setState({ thinking })
}

export const setSearch = (search: boolean) => {
  write(KEYS.search, String(search))
  useSettings.setState({ search })
}

export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}
