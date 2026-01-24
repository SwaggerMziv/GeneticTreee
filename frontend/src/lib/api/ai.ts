import { getAccessToken } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIStreamChunk {
  type: 'text' | 'thinking' | 'status' | 'result' | 'action' | 'warning' | 'error' | 'done'
  content: string
}

export interface GenerateResult {
  relatives: Array<{
    temp_id: string
    first_name: string
    last_name: string
    middle_name?: string
    gender: string
    birth_date?: string
    death_date?: string
    is_user: boolean
  }>
  relationships: Array<{
    from_temp_id: string
    to_temp_id: string
    relationship_type: string
  }>
  validation_warnings: string[]
}

export interface ApplyGenerationResult {
  created_relatives: Array<{
    temp_id: string
    id: number
    name: string
  }>
  created_relationships: Array<{
    id: number
    from_id: number
    to_id: number
    type: string
  }>
  errors: string[]
  warnings: string[]
}

export interface ValidationConflict {
  relative_id: number
  relative_name: string
  conflict_type: string
  conflicting_relationships: string[]
  suggestion: string
}

// Streaming API for AI generation
export async function* streamGenerateTree(
  description: string
): AsyncGenerator<AIStreamChunk> {
  const token = getAccessToken()

  const response = await fetch(`${API_URL}/api/v1/ai/generate/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    credentials: 'include',
    body: JSON.stringify({ description }),
  })

  if (!response.ok) {
    try {
      const errorData = await response.json()
      console.error('AI Generate Error:', errorData)
    } catch (e) {
      console.error('AI Generate Error (text):', await response.text())
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          yield data as AIStreamChunk
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

// Streaming API for AI editing
export async function* streamEditTree(
  message: string,
  history: ChatMessage[]
): AsyncGenerator<AIStreamChunk> {
  const token = getAccessToken()

  const response = await fetch(`${API_URL}/api/v1/ai/edit/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    credentials: 'include',
    body: JSON.stringify({ message, history }),
  })

  if (!response.ok) {
    try {
      const errorData = await response.json()
      console.error('AI Edit Error:', errorData)
    } catch (e) {
      console.error('AI Edit Error (text):', await response.text())
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          yield data as AIStreamChunk
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

// Streaming API for Unified Assistant
export async function* streamUnified(
  message: string,
  history: ChatMessage[],
  opts?: { mode?: 'base' | 'smart'; auto_accept?: boolean }
): AsyncGenerator<AIStreamChunk> {
  const token = getAccessToken()
  const payload: any = { message, history }
  if (opts?.mode) payload.mode = opts.mode
  if (typeof opts?.auto_accept === 'boolean') payload.auto_accept = opts.auto_accept

  const response = await fetch(`${API_URL}/api/v1/ai/unified/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    try {
      const errorData = await response.json()
      console.error('AI Unified Error:', errorData)
    } catch (e) {
      console.error('AI Unified Error (text):', await response.text())
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          yield data as AIStreamChunk
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

// Apply generation result
export async function applyGenerationResult(
  result: GenerateResult
): Promise<ApplyGenerationResult> {
  const token = getAccessToken()

  const response = await fetch(`${API_URL}/api/v1/ai/apply-generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    credentials: 'include',
    body: JSON.stringify(result),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Validate tree
export async function validateTree(userId: number): Promise<ValidationConflict[]> {
  const token = getAccessToken()

  const response = await fetch(`${API_URL}/api/v1/ai/validate/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const aiApi = {
  streamGenerateTree,
  streamEditTree,
  streamUnified,
  applyGenerationResult,
  validateTree,
}
