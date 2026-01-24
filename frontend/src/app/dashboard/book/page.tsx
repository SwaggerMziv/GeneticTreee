'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Spin, message, Progress, Checkbox } from 'antd'
import {
  TreePine,
  ArrowLeft,
  BookOpen,
  FileText,
  Download,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { statisticsApi } from '@/lib/api/family'
import {
  streamGenerateBook,
  downloadPdfFromBase64,
  BookStyle,
  BookStreamChunk,
} from '@/lib/api/book'
import { User as UserType, ApiError, FamilyStatistics } from '@/types'
import { isAuthenticated, getErrorMessage } from '@/lib/utils'

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error'

export default function BookGeneratorPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [stats, setStats] = useState<FamilyStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [currentChapter, setCurrentChapter] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // PDF result
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [pdfFilename, setPdfFilename] = useState<string>('family_book.pdf')

  // Book options
  const [bookStyle, setBookStyle] = useState<BookStyle>('classic')
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeStories, setIncludeStories] = useState(true)
  const [includeTimeline, setIncludeTimeline] = useState(true)

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth')
      return
    }

    const fetchData = async () => {
      try {
        const userData = await authApi.me()
        setUser(userData)

        try {
          const statsData = await statisticsApi.getStatistics(userData.id)
          setStats(statsData)
        } catch {
          setStats(null)
        }
      } catch (error) {
        const apiError = error as ApiError
        const errorMessage = getErrorMessage(apiError)
        message.error(errorMessage)
        if (apiError.status === 401) {
          router.push('/auth')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleGenerateBook = async () => {
    if (!stats || stats.total_relatives === 0) {
      message.warning('Добавьте родственников для создания книги')
      return
    }

    setGenerationStatus('generating')
    setProgress(0)
    setStatusMessage('Начинаем генерацию...')
    setCurrentChapter(null)
    setErrorMessage(null)
    setPdfBase64(null)

    try {
      const generator = streamGenerateBook({
        style: bookStyle,
        include_photos: includePhotos,
        include_stories: includeStories,
        include_timeline: includeTimeline,
        language: 'ru',
      })

      for await (const chunk of generator) {
        if (chunk.type === 'progress') {
          setProgress(chunk.progress)
          setStatusMessage(chunk.message)
          if (chunk.current_chapter) {
            setCurrentChapter(chunk.current_chapter)
          }
        } else if (chunk.type === 'result') {
          setPdfBase64(chunk.pdf_base64)
          setPdfFilename(chunk.filename)
          setGenerationStatus('completed')
          setStatusMessage('Книга успешно сгенерирована!')
          message.success('Книга готова к скачиванию!')
        } else if (chunk.type === 'error') {
          setErrorMessage(chunk.message)
          setGenerationStatus('error')
          message.error(chunk.message)
        } else if (chunk.type === 'done') {
          if (generationStatus === 'generating') {
            // If we're still generating when done arrives, something went wrong
            if (!pdfBase64) {
              setGenerationStatus('error')
              setErrorMessage('Генерация завершилась без результата')
            }
          }
        }
      }
    } catch (error) {
      console.error('Book generation error:', error)
      setGenerationStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Ошибка генерации')
      message.error('Произошла ошибка при генерации книги')
    }
  }

  const handleDownloadPdf = () => {
    if (pdfBase64) {
      downloadPdfFromBase64(pdfBase64, pdfFilename)
      message.success('PDF скачивается...')
    }
  }

  const handleReset = () => {
    setGenerationStatus('idle')
    setProgress(0)
    setStatusMessage('')
    setCurrentChapter(null)
    setErrorMessage(null)
    setPdfBase64(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <Spin size="large" />
      </div>
    )
  }

  const bookStyles = [
    { value: 'classic' as BookStyle, label: 'Классический стиль', description: 'Элегантный дизайн с традиционным оформлением' },
    { value: 'modern' as BookStyle, label: 'Современный стиль', description: 'Минималистичный дизайн с чистыми линиями' },
    { value: 'vintage' as BookStyle, label: 'Винтажный стиль', description: 'Состаренный вид с декоративными элементами' },
  ]

  return (
    <div className="min-h-screen bg-charcoal-950">
      {/* Header */}
      <header className="border-b border-charcoal-700 bg-charcoal-900/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center transition-transform group-hover:scale-105">
              <TreePine className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-2xl font-bold">
              <span className="text-white">Genetic</span>
              <span className="gradient-text">Tree</span>
            </span>
          </Link>

          <Button
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push('/dashboard')}
            className="bg-charcoal-800 border-charcoal-700 hover:border-orange"
          >
            Назад
          </Button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-800 border border-charcoal-700 mb-4">
            <Sparkles className="w-4 h-4 text-orange" />
            <span className="text-sm text-gray-300 font-medium">
              AI Генерация
            </span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
            Семейная <span className="gradient-text">книга</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Создайте уникальную книгу о вашей семье с историями, фотографиями и генеалогическим древом
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Book Style */}
            <div className="p-6 rounded-2xl bg-charcoal-900 border border-charcoal-700">
              <h3 className="font-serif text-xl font-bold mb-6 text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange" />
                Стиль книги
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bookStyles.map((style) => (
                  <div
                    key={style.value}
                    onClick={() => generationStatus === 'idle' && setBookStyle(style.value)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      bookStyle === style.value
                        ? 'border-orange bg-orange/10'
                        : 'border-charcoal-700 hover:border-charcoal-600'
                    } ${generationStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-white mb-1">{style.label}</div>
                    <div className="text-sm text-gray-400">{style.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Options */}
            <div className="p-6 rounded-2xl bg-charcoal-900 border border-charcoal-700">
              <h3 className="font-serif text-xl font-bold mb-6 text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange" />
                Содержание книги
              </h3>
              <div className="space-y-4">
                <Checkbox
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  disabled={generationStatus !== 'idle'}
                  className="text-gray-300"
                >
                  <span className="text-gray-300">Включить фотографии родственников</span>
                </Checkbox>
                <Checkbox
                  checked={includeStories}
                  onChange={(e) => setIncludeStories(e.target.checked)}
                  disabled={generationStatus !== 'idle'}
                  className="text-gray-300"
                >
                  <span className="text-gray-300">Включить семейные истории</span>
                </Checkbox>
                <Checkbox
                  checked={includeTimeline}
                  onChange={(e) => setIncludeTimeline(e.target.checked)}
                  disabled={generationStatus !== 'idle'}
                  className="text-gray-300"
                >
                  <span className="text-gray-300">Включить временную шкалу семьи</span>
                </Checkbox>
              </div>
            </div>

            {/* Generation Status */}
            {generationStatus !== 'idle' && (
              <div className="p-6 rounded-2xl bg-charcoal-900 border border-charcoal-700">
                <h3 className="font-serif text-xl font-bold mb-6 text-white flex items-center gap-2">
                  {generationStatus === 'generating' && <Clock className="w-5 h-5 text-orange animate-pulse" />}
                  {generationStatus === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {generationStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  Статус генерации
                </h3>

                <Progress
                  percent={Math.round(progress)}
                  status={
                    generationStatus === 'generating'
                      ? 'active'
                      : generationStatus === 'completed'
                      ? 'success'
                      : 'exception'
                  }
                  strokeColor={{
                    '0%': '#ff6b35',
                    '100%': '#ff8c5a',
                  }}
                />

                <div className="mt-4 text-sm text-gray-400">
                  {statusMessage}
                  {currentChapter && generationStatus === 'generating' && (
                    <span className="block mt-1 text-orange">
                      Глава: {currentChapter}
                    </span>
                  )}
                </div>

                {generationStatus === 'completed' && pdfBase64 && (
                  <div className="mt-6 p-4 rounded-xl bg-green-900/20 border border-green-700/30">
                    <p className="text-gray-300 mb-4">
                      Ваша семейная книга готова! Нажмите кнопку ниже, чтобы скачать PDF.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        type="primary"
                        icon={<Download className="w-4 h-4" />}
                        onClick={handleDownloadPdf}
                        className="shadow-glow-orange"
                      >
                        Скачать PDF
                      </Button>
                      <Button
                        onClick={handleReset}
                        className="bg-charcoal-800 border-charcoal-700"
                      >
                        Создать заново
                      </Button>
                    </div>
                  </div>
                )}

                {generationStatus === 'error' && (
                  <div className="mt-6 p-4 rounded-xl bg-red-900/20 border border-red-700/30">
                    <p className="text-red-400 mb-4">
                      {errorMessage || 'Произошла ошибка при генерации книги'}
                    </p>
                    <Button
                      onClick={handleReset}
                      className="bg-charcoal-800 border-charcoal-700"
                    >
                      Попробовать снова
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="p-6 rounded-2xl bg-charcoal-900 border border-charcoal-700">
              <h3 className="font-serif text-xl font-bold mb-4 text-white">
                Данные для книги
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Родственников:</span>
                  <span className="text-white font-medium">{stats?.total_relatives || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Связей:</span>
                  <span className="text-white font-medium">{stats?.total_relationships || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Поколений:</span>
                  <span className="text-white font-medium">{stats?.generations_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              type="primary"
              size="large"
              icon={<Sparkles className="w-5 h-5" />}
              onClick={handleGenerateBook}
              loading={generationStatus === 'generating'}
              disabled={!stats || stats.total_relatives === 0 || generationStatus === 'generating'}
              className="w-full h-14 text-lg shadow-glow-orange"
            >
              {generationStatus === 'generating' ? 'Генерация...' : 'Сгенерировать книгу'}
            </Button>

            {(!stats || stats.total_relatives === 0) && (
              <p className="text-center text-sm text-gray-500">
                Добавьте родственников в ваше древо, чтобы создать книгу
              </p>
            )}

            {/* Info */}
            <div className="p-4 rounded-xl bg-charcoal-800 border border-charcoal-700">
              <p className="text-sm text-gray-400">
                <span className="text-orange font-medium">Примечание:</span> Генерация книги использует искусственный интеллект для создания связного повествования на основе ваших семейных данных и историй.
              </p>
            </div>

            {/* Estimated time */}
            {generationStatus === 'idle' && stats && stats.total_relatives > 0 && (
              <div className="p-4 rounded-xl bg-charcoal-800 border border-charcoal-700">
                <p className="text-sm text-gray-400">
                  <Clock className="w-4 h-4 inline mr-2 text-orange" />
                  Примерное время: 1-3 минуты в зависимости от количества родственников
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
