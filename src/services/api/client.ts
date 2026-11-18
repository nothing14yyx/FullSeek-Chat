import { translate, type TranslationMessage } from '../../i18n/index.js'
import { useSettings } from '../settings.js'
import { readMessageEvent } from './parseEvent.js'
import { readServerSentEvents } from './sse.js'
import type {
  ApiErrorBody,
  AssistantBlockParam,
  CreateMessageRequest,
  FileObject,
  FilePurpose,
  MessageParam,
  MessageStreamEvent,
} from './types.js'
import { DEFAULT_API_ORIGIN } from './config.js'

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

/** 不带协议版本前缀的地址，用于 DeepSeek 的 /models 与 /v1/tools 接口。 */
export const apiRootUrl = (path: string): string =>
  `${stripTrailingSlash(useSettings.getState().apiOrigin)}${path}`

/** Messages 使用协议前缀；Responses 直接在配置的 base URL 后追加路由。 */
export const apiUrl = (path: string): string => {
  const { apiOrigin, apiProtocol } = useSettings.getState()
  const origin = stripTrailingSlash(apiOrigin)
  if (apiProtocol === 'responses') {
    return `${origin}${path}`
  }
  if (/\/(?:anthropic\/)?v1$/i.test(origin)) {
    return `${origin}${path}`
  }
  if (origin === DEFAULT_API_ORIGIN) {
    return `${origin}/anthropic/v1${path}`
  }
  return `${origin}/v1${path}`
}
/** 引用 Files API 上传的图片、调用 Anthropic 兼容 Files API 时必须携带 */
const FILES_BETA = 'files-api-2025-04-14'

export type ApiErrorKind =
  /** 非 2xx 响应 */
  | 'http'
  /** 流中返回的错误帧（如等待生成超时），随后连接关闭 */
  | 'stream'
  /** 请求没有到达服务端（断网、跨域被拦截等） */
  | 'network'
  /** 流在 message_stop 之前结束 */
  | 'interrupted'
  /** 响应不符合协议（如非 SSE 响应） */
  | 'protocol'

export class ApiError extends Error {
  readonly localMessage?: TranslationMessage

  constructor(
    readonly kind: ApiErrorKind,
    message: string | TranslationMessage,
    readonly status?: number,
    readonly code?: string
  ) {
    super(typeof message === 'string' ? message : translate(message.key, message.params))
    this.name = 'ApiError'
    this.localMessage = typeof message === 'string' ? undefined : message
  }
}

const isErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof (value as ApiErrorBody).error?.message === 'string'

const readErrorResponse = async (
  response: Response,
  kind: 'http' | 'protocol' = 'http',
  fallback = response.statusText
): Promise<ApiError> => {
  const text = await response.text().catch(() => '')
  let message = text || fallback
  let code: string | undefined
  try {
    const body: unknown = JSON.parse(text)
    if (isErrorBody(body)) {
      message = body.error.message
      code = typeof body.error.code === 'string' ? body.error.code : undefined
    }
  } catch {
    // 非 JSON 响应体直接展示原文
  }
  return new ApiError(kind, message, response.status, code)
}

export const request = async (url: string, init: RequestInit): Promise<Response> => {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (init.signal?.aborted) {
      throw error
    }
    throw new ApiError('network', error instanceof Error ? error.message : String(error))
  }
  if (!response.ok) {
    throw await readErrorResponse(response)
  }
  return response
}

const anthropicHeaders = (apiKey: string, beta: boolean): Record<string, string> => ({
  'anthropic-version': '2023-06-01',
  'x-api-key': apiKey,
  // Files API 和通过 file_id 引用图片时必传；纯文本聊天无需携带。
  ...(beta ? { 'anthropic-beta': FILES_BETA } : {}),
})

const modelsUrl = () => {
  const { apiOrigin } = useSettings.getState()
  return stripTrailingSlash(apiOrigin) === DEFAULT_API_ORIGIN
    ? apiRootUrl('/models')
    : apiUrl('/models')
}

/** 用 GET /models 校验 API Key（不产生费用） */
export const verifyApiKey = async (apiKey: string, signal?: AbortSignal): Promise<void> => {
  const url = modelsUrl()
  await request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  })
}

/** 获取当前网关可用的模型 ID，用于设置中的模型选择器。 */
export const listModels = async (apiKey: string, signal?: AbortSignal): Promise<string[]> => {
  const response = await request(modelsUrl(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  })
  const body: unknown = await response.json()
  const record = asRecord(body)
  const entries = Array.isArray(record?.data)
    ? record.data
    : Array.isArray(record?.models)
      ? record.models
      : Array.isArray(body)
        ? body
        : []
  const models = entries.flatMap((entry) => {
    const model = asRecord(entry)
    const id =
      typeof model?.id === 'string' ? model.id : typeof model?.name === 'string' ? model.name : ''
    return id ? [id] : []
  })
  if (models.length === 0) {
    throw new ApiError('protocol', 'The model list response did not contain model IDs')
  }
  return [...new Set(models)].sort((a, b) => a.localeCompare(b))
}

/**
 * POST /anthropic/v1/files 上传附件（不设过期时间，会话里的历史附件一直可用）。
 * purpose 为 null 时不传该字段（图片）；purpose 必须排在 file 之前。
 */
export const uploadFile = async (
  apiKey: string,
  file: File,
  purpose: FilePurpose | null,
  signal?: AbortSignal
): Promise<FileObject> => {
  const responsesProtocol = useSettings.getState().apiProtocol === 'responses'
  const form = new FormData()
  if (responsesProtocol || purpose) {
    form.append('purpose', purpose ?? 'user_data')
  }
  form.append('file', file)
  const response = await request(apiUrl('/files'), {
    method: 'POST',
    headers: responsesProtocol
      ? { Authorization: `Bearer ${apiKey}` }
      : anthropicHeaders(apiKey, true),
    body: form,
    signal,
  })
  const body: unknown = await response.json()
  if (responsesProtocol && typeof body === 'object' && body !== null) {
    const fileBody = body as Record<string, unknown>
    return {
      id: String(fileBody.id ?? ''),
      type: 'file',
      size_bytes: Number(fileBody.bytes ?? file.size),
      created_at: String(fileBody.created_at ?? ''),
      filename: String(fileBody.filename ?? file.name),
      mime_type: file.type,
    }
  }
  return body as FileObject
}

/** 删除当前网关上的 Files API 文件。 */
export const deleteFile = async (apiKey: string, fileId: string): Promise<void> => {
  const responsesProtocol = useSettings.getState().apiProtocol === 'responses'
  await request(apiUrl(`/files/${encodeURIComponent(fileId)}`), {
    method: 'DELETE',
    headers: responsesProtocol
      ? { Authorization: `Bearer ${apiKey}` }
      : anthropicHeaders(apiKey, true),
  })
}

const hasFile = (body: CreateMessageRequest) =>
  body.messages.some(
    (message) =>
      typeof message.content !== 'string' &&
      message.content.some((block) => block.type === 'image' || block.type === 'document')
  )

type ResponsesInputContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; file_id: string }
  | { type: 'input_file'; file_id: string }

type ResponsesInputMessage = {
  role: 'user' | 'assistant'
  content: string | ResponsesInputContent[]
}

const toResponsesInput = (messages: MessageParam[]): ResponsesInputMessage[] => {
  const input: ResponsesInputMessage[] = []
  for (const message of messages) {
    if (message.role === 'latest_reminder') {
      continue
    }
    if (message.role === 'user') {
      if (typeof message.content === 'string') {
        input.push({ role: 'user', content: message.content })
        continue
      }
      const content: ResponsesInputContent[] = []
      for (const block of message.content) {
        if (block.type === 'text') {
          content.push({ type: 'input_text', text: block.text })
        } else if (block.type === 'image') {
          content.push({ type: 'input_image', file_id: block.source.file_id })
        } else {
          content.push({ type: 'input_file', file_id: block.source.file_id })
        }
      }
      if (content.length > 0) {
        input.push({ role: 'user', content })
      }
      continue
    }
    const text = message.content
      .filter(
        (block): block is Extract<AssistantBlockParam, { type: 'text' }> => block.type === 'text'
      )
      .map((block) => block.text)
      .join('')
    if (text) {
      input.push({ role: 'assistant', content: text })
    }
  }
  return input
}

const firstUserText = (messages: MessageParam[]): string => {
  const message = messages.find((item) => item.role === 'user')
  if (!message) {
    return ''
  }
  return typeof message.content === 'string'
    ? message.content
    : message.content
        .filter((block) => block.type === 'text')
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join(' ')
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const readUsage = (value: unknown) => {
  const usage = asRecord(value)
  const inputDetails = asRecord(usage?.input_tokens_details)
  return {
    input_tokens: typeof usage?.input_tokens === 'number' ? usage.input_tokens : 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens:
      typeof inputDetails?.cached_tokens === 'number' ? inputDetails.cached_tokens : 0,
    output_tokens: typeof usage?.output_tokens === 'number' ? usage.output_tokens : 0,
  }
}

const streamResponses = async function* (
  apiKey: string,
  body: CreateMessageRequest,
  signal: AbortSignal
): AsyncGenerator<MessageStreamEvent> {
  const { apiOrigin, responsesModel, search } = useSettings.getState()
  const usesDeepSeekGateway = stripTrailingSlash(apiOrigin) === DEFAULT_API_ORIGIN
  const tools = usesDeepSeekGateway
    ? body.tools.map((tool) => ({ type: tool.type }))
    : search
      ? [{ type: 'web_search' }]
      : undefined
  const response = await request(apiUrl('/responses'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: responsesModel,
      instructions: body.system,
      input: toResponsesInput(body.messages),
      stream: true,
      store: false,
      ...(body.thinking.type === 'enabled' ? { reasoning: { effort: 'medium' } } : {}),
      ...(tools ? { tools } : {}),
    }),
    signal,
  })
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!response.body || !contentType.includes('text/event-stream')) {
    throw await readErrorResponse(response, 'protocol', '')
  }

  let messageStarted = false
  let textIndex = -1
  let thinkingIndex = -1
  let nextIndex = 0
  let accumulatedText = ''
  let refused = false
  const begin = (responseObject: Record<string, unknown> | null): MessageStreamEvent | null => {
    if (messageStarted) {
      return null
    }
    messageStarted = true
    return {
      type: 'message_start',
      message: {
        id: typeof responseObject?.id === 'string' ? responseObject.id : `responses-${Date.now()}`,
        model: responsesModel,
        usage: {
          input_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          output_tokens: 0,
        },
      },
    }
  }
  const finish = (responseObject: Record<string, unknown> | null): MessageStreamEvent[] => {
    const events: MessageStreamEvent[] = []
    if (textIndex >= 0) {
      events.push({ type: 'content_block_stop', index: textIndex })
    }
    if (thinkingIndex >= 0) {
      events.push({ type: 'content_block_stop', index: thinkingIndex })
    }
    const details = asRecord(responseObject?.incomplete_details)
    const stopReason =
      details?.reason === 'max_output_tokens' ? 'max_tokens' : refused ? 'refusal' : 'end_turn'
    const title = body.title?.enabled
      ? firstUserText(body.messages).trim().replace(/\s+/g, ' ').slice(0, 48)
      : ''
    events.push({
      type: 'message_delta',
      delta: {
        stop_reason: stopReason,
        stop_sequence: null,
        ...(refused
          ? { stop_details: { type: 'refusal' as const, category: null, explanation: null } }
          : {}),
        ...(title ? { title } : {}),
      },
      ...(responseObject?.usage ? { usage: readUsage(responseObject.usage) } : {}),
    })
    events.push({ type: 'message_stop' })
    return events
  }

  let completed = false
  for await (const { event: eventName, data } of readServerSentEvents(response.body, signal)) {
    if (data === '[DONE]') {
      if (!completed) {
        const started = begin(null)
        if (started) {
          yield started
        }
        for (const event of finish(null)) {
          yield event
        }
        completed = true
      }
      return
    }
    let payload: unknown
    try {
      payload = JSON.parse(data)
    } catch {
      if (eventName === 'error') {
        throw new ApiError('stream', data)
      }
      continue
    }
    const record = asRecord(payload)
    if (!record) {
      continue
    }
    const type = typeof record.type === 'string' ? record.type : eventName
    const responseObject = asRecord(record.response)
    if (type === 'error' || type === 'response.failed') {
      const error = asRecord(record.error) ?? asRecord(responseObject?.error)
      throw new ApiError(
        'stream',
        typeof error?.message === 'string' ? error.message : 'Response request failed'
      )
    }
    const started = begin(responseObject)
    if (started) {
      yield started
    }
    if (type === 'response.output_text.delta') {
      const delta = typeof record.delta === 'string' ? record.delta : ''
      if (!delta) {
        continue
      }
      if (textIndex < 0) {
        textIndex = nextIndex++
        yield {
          type: 'content_block_start',
          index: textIndex,
          content_block: { type: 'text', text: '' },
        }
      }
      accumulatedText += delta
      yield {
        type: 'content_block_delta',
        index: textIndex,
        delta: { type: 'text_delta', text: delta },
      }
      continue
    }
    if (type === 'response.reasoning_summary_text.delta' || type === 'response.reasoning_text.delta') {
      const delta = typeof record.delta === 'string' ? record.delta : ''
      if (!delta) {
        continue
      }
      if (thinkingIndex < 0) {
        thinkingIndex = nextIndex++
        yield {
          type: 'content_block_start',
          index: thinkingIndex,
          content_block: { type: 'thinking', thinking: '', signature: '' },
        }
      }
      yield {
        type: 'content_block_delta',
        index: thinkingIndex,
        delta: { type: 'thinking_delta', thinking: delta },
      }
      continue
    }
    if (type === 'response.refusal.delta') {
      const delta = typeof record.delta === 'string' ? record.delta : ''
      if (!delta) {
        continue
      }
      refused = true
      if (textIndex < 0) {
        textIndex = nextIndex++
        yield {
          type: 'content_block_start',
          index: textIndex,
          content_block: { type: 'text', text: '' },
        }
      }
      accumulatedText += delta
      yield {
        type: 'content_block_delta',
        index: textIndex,
        delta: { type: 'text_delta', text: delta },
      }
      continue
    }
    if (type === 'response.output_text.annotation.added') {
      const annotation = asRecord(record.annotation)
      if (
        annotation?.type === 'url_citation' &&
        typeof annotation.url === 'string' &&
        textIndex >= 0
      ) {
        const start = typeof annotation.start_index === 'number' ? annotation.start_index : 0
        const end = typeof annotation.end_index === 'number' ? annotation.end_index : start
        const citation = {
          type: 'web_search_result_location' as const,
          url: annotation.url,
          title: typeof annotation.title === 'string' ? annotation.title : null,
          cited_text: accumulatedText.slice(start, end),
          encrypted_index: '',
        }
        yield {
          type: 'content_block_delta',
          index: textIndex,
          delta: { type: 'citations_delta', citation },
        }
      }
      continue
    }
    if (type === 'response.completed' || type === 'response.incomplete') {
      for (const event of finish(responseObject)) {
        yield event
      }
      completed = true
      return
    }
  }
  if (!completed) {
    throw new ApiError('interrupted', '')
  }
}

/**
 * 以当前设置的 Messages 或 Responses 协议发起流式聊天，向界面统一产出消息事件。
 * ping、保活注释与无法解析的内容不产出；中止请求时抛出 signal 的 AbortError。
 */
export async function* streamMessage(
  apiKey: string,
  body: CreateMessageRequest,
  signal: AbortSignal
): AsyncGenerator<MessageStreamEvent> {
  const { apiProtocol, messagesModel, responsesModel } = useSettings.getState()
  if (!(apiProtocol === 'responses' ? responsesModel : messagesModel).trim()) {
    throw new ApiError('protocol', { key: 'apiModelRequired' })
  }
  if (apiProtocol === 'responses') {
    yield* streamResponses(apiKey, body, signal)
    return
  }
  const response = await request(apiUrl('/messages'), {
    method: 'POST',
    headers: {
      ...anthropicHeaders(apiKey, hasFile(body)),
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ ...body, model: messagesModel, stream: true }),
    signal,
  })
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!response.body || !contentType.includes('text/event-stream')) {
    throw await readErrorResponse(response, 'protocol', '')
  }
  for await (const { event: eventName, data } of readServerSentEvents(response.body, signal)) {
    let payload: unknown
    try {
      payload = JSON.parse(data)
    } catch {
      if (eventName !== 'error') {
        continue
      }
    }
    if (isErrorBody(payload)) {
      throw new ApiError('stream', payload.error.message)
    }
    if (eventName === 'error') {
      throw new ApiError('stream', data)
    }
    const event = readMessageEvent(payload)
    if (!event) {
      continue
    }
    yield event
    if (event.type === 'message_stop') {
      return
    }
  }
  // 服务端没有提供错误内容时保持为空，不推测断流原因。
  throw new ApiError('interrupted', '')
}
