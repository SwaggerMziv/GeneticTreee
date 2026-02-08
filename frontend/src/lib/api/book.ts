import { getAccessToken } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type BookStyle = 'classic' | 'modern' | 'vintage' | 'custom'
export type BookTheme = 'light' | 'dark'

export interface BookGenerateRequest {
  style?: BookStyle
  theme?: BookTheme
  custom_style_description?: string
  include_photos?: boolean
  include_stories?: boolean
  include_timeline?: boolean
  language?: string
}

export interface BookProgressChunk {
  type: 'progress'
  stage: string
  progress: number
  current_chapter?: string
  message: string
}

export interface BookResultChunk {
  type: 'result'
  pdf_base64: string
  filename: string
}

export interface BookErrorChunk {
  type: 'error'
  message: string
}

export interface BookDoneChunk {
  type: 'done'
}

export type BookStreamChunk = BookProgressChunk | BookResultChunk | BookErrorChunk | BookDoneChunk

// Streaming API for book generation
export async function* streamGenerateBook(
  options: BookGenerateRequest = {}
): AsyncGenerator<BookStreamChunk> {
  const token = getAccessToken()

  const payload: Record<string, unknown> = {
    style: options.style || 'classic',
    theme: options.theme || 'light',
    include_photos: options.include_photos ?? true,
    include_stories: options.include_stories ?? true,
    include_timeline: options.include_timeline ?? true,
    language: options.language || 'ru',
  }

  if (options.custom_style_description) {
    payload.custom_style_description = options.custom_style_description
  }

  const response = await fetch(`${API_URL}/api/v1/book/generate/stream`, {
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
      console.error('Book Generate Error:', errorData)
    } catch {
      console.error('Book Generate Error (text):', await response.text())
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
          yield data as BookStreamChunk
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

// Helper function to download PDF from base64
export function downloadPdfFromBase64(base64: string, filename: string) {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export const bookApi = {
  streamGenerateBook,
  downloadPdfFromBase64,
}
