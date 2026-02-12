'use client'

import { useState, useRef } from 'react'
import { Checkbox } from 'antd'
import {
  BookOpen,
  FileText,
  Download,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  Palette,
  Loader2,
} from 'lucide-react'
import {
  streamGenerateBook,
  downloadPdfFromBase64,
  BookStyle,
  BookTheme,
} from '@/lib/api/book'
import { useUser } from '@/components/providers/UserProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error'

export default function BookGeneratorPage() {
  const { user, stats } = useUser()
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
  const [bookTheme, setBookTheme] = useState<BookTheme>('light')
  const [customStyleDescription, setCustomStyleDescription] = useState('')
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeStories, setIncludeStories] = useState(true)
  const [includeTimeline, setIncludeTimeline] = useState(true)

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleGenerateBook = async () => {
    if (!stats || stats.total_relatives === 0) {
      toast.warning('Добавьте родственников для создания книги')
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
        theme: bookTheme,
        custom_style_description: bookStyle === 'custom' ? customStyleDescription : undefined,
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
          toast.success('Книга готова к скачиванию!')
        } else if (chunk.type === 'error') {
          setErrorMessage(chunk.message)
          setGenerationStatus('error')
          toast.error(chunk.message)
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
      toast.error('Произошла ошибка при генерации книги')
    }
  }

  const handleDownloadPdf = () => {
    if (pdfBase64) {
      downloadPdfFromBase64(pdfBase64, pdfFilename)
      toast.success('PDF скачивается...')
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

  const bookStyles = [
    { value: 'classic' as BookStyle, label: 'Классический стиль', description: 'Элегантный дизайн с традиционным оформлением' },
    { value: 'modern' as BookStyle, label: 'Современный стиль', description: 'Минималистичный дизайн с чистыми линиями' },
    { value: 'vintage' as BookStyle, label: 'Винтажный стиль', description: 'Состаренный вид с декоративными элементами' },
    { value: 'custom' as BookStyle, label: 'Свой стиль', description: 'Опишите желаемый стиль повествования' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border shadow-sm mb-4">
          <Sparkles className="w-4 h-4 text-azure" />
          <span className="text-sm text-muted-foreground font-medium">
            AI Генерация
          </span>
        </div>
        <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
          Семейная <span className="gradient-text">книга</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Создайте уникальную книгу о вашей семье с историями, фотографиями и генеалогическим древом
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Book Style */}
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h3 className="font-serif text-xl font-bold mb-6 text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-azure" />
                Стиль книги
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookStyles.map((style) => (
                  <div
                    key={style.value}
                    onClick={() => generationStatus === 'idle' && setBookStyle(style.value)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      bookStyle === style.value
                        ? 'border-azure bg-azure/10'
                        : 'border-border hover:border-muted-foreground'
                    } ${generationStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-foreground mb-1">{style.label}</div>
                    <div className="text-sm text-muted-foreground">{style.description}</div>
                  </div>
                ))}
              </div>

              {/* Custom style textarea */}
              {bookStyle === 'custom' && (
                <div className="mt-4">
                  <label className="block text-sm text-muted-foreground mb-2">
                    Опишите желаемый стиль повествования (макс. 500 символов)
                  </label>
                  <textarea
                    value={customStyleDescription}
                    onChange={(e) => setCustomStyleDescription(e.target.value.slice(0, 500))}
                    disabled={generationStatus !== 'idle'}
                    placeholder="Например: Пиши в стиле сказки для детей, с простыми словами и добрыми интонациями..."
                    className="w-full h-24 p-3 rounded-xl bg-muted border border-border shadow-sm text-foreground placeholder-muted-foreground resize-none focus:border-azure focus:outline-none disabled:opacity-50"
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {customStyleDescription.length}/500
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Theme Selector */}
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h3 className="font-serif text-xl font-bold mb-6 text-foreground flex items-center gap-2">
                <Palette className="w-5 h-5 text-azure" />
                Тема оформления
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => generationStatus === 'idle' && setBookTheme('light')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    bookTheme === 'light'
                      ? 'border-azure bg-azure/10'
                      : 'border-border hover:border-muted-foreground'
                  } ${generationStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                    <Sun className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Светлая</div>
                    <div className="text-xs text-muted-foreground">Белый фон, тёмный текст</div>
                  </div>
                </div>
                <div
                  onClick={() => generationStatus === 'idle' && setBookTheme('dark')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    bookTheme === 'dark'
                      ? 'border-azure bg-azure/10'
                      : 'border-border hover:border-muted-foreground'
                  } ${generationStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-charcoal-800 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Тёмная</div>
                    <div className="text-xs text-muted-foreground">Тёмный фон, светлый текст</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Options */}
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h3 className="font-serif text-xl font-bold mb-6 text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-azure" />
                Содержание книги
              </h3>
              <div className="space-y-4">
                <Checkbox
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  disabled={generationStatus !== 'idle'}
                  className="text-muted-foreground"
                >
                  <span className="text-muted-foreground">Включить фотографии родственников</span>
                </Checkbox>
                <Checkbox
                  checked={includeStories}
                  onChange={(e) => setIncludeStories(e.target.checked)}
                  disabled={generationStatus !== 'idle'}
                  className="text-muted-foreground"
                >
                  <span className="text-muted-foreground">Включить семейные истории</span>
                </Checkbox>
                <Checkbox
                  checked={includeTimeline}
                  onChange={(e) => setIncludeTimeline(e.target.checked)}
                  disabled={generationStatus !== 'idle'}
                  className="text-muted-foreground"
                >
                  <span className="text-muted-foreground">Включить временную шкалу семьи</span>
                </Checkbox>
              </div>
            </CardContent>
          </Card>

          {/* Generation Status */}
          {generationStatus !== 'idle' && (
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <h3 className="font-serif text-xl font-bold mb-6 text-foreground flex items-center gap-2">
                  {generationStatus === 'generating' && <Clock className="w-5 h-5 text-azure animate-pulse" />}
                  {generationStatus === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {generationStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  Статус генерации
                </h3>

                <Progress
                  value={Math.round(progress)}
                  className={
                    generationStatus === 'error'
                      ? '[&>div]:bg-red-500'
                      : generationStatus === 'completed'
                      ? '[&>div]:bg-green-500'
                      : ''
                  }
                />

                <div className="mt-4 text-sm text-muted-foreground">
                  {statusMessage}
                  {currentChapter && generationStatus === 'generating' && (
                    <span className="block mt-1 text-azure">
                      Глава: {currentChapter}
                    </span>
                  )}
                </div>

                {generationStatus === 'completed' && pdfBase64 && (
                  <div className="mt-6 p-4 rounded-xl bg-green-900/20 border border-green-700/30">
                    <p className="text-muted-foreground mb-4">
                      Ваша семейная книга готова! Нажмите кнопку ниже, чтобы скачать PDF.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleDownloadPdf}
                        className="shadow-glow-azure"
                      >
                        <Download className="w-4 h-4" />
                        Скачать PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="bg-charcoal-800 border-border hover:bg-charcoal-700"
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
                      variant="outline"
                      onClick={handleReset}
                      className="bg-charcoal-800 border-border hover:bg-charcoal-700"
                    >
                      Попробовать снова
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          {/* Stats */}
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h3 className="font-serif text-xl font-bold mb-4 text-foreground">
                Данные для книги
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Родственников:</span>
                  <span className="text-foreground font-medium">{stats?.total_relatives || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Связей:</span>
                  <span className="text-foreground font-medium">{stats?.total_relationships || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Поколений:</span>
                  <span className="text-foreground font-medium">{stats?.generations_count || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            size="lg"
            onClick={handleGenerateBook}
            disabled={
              !stats ||
              stats.total_relatives === 0 ||
              generationStatus === 'generating' ||
              (bookStyle === 'custom' && !customStyleDescription.trim())
            }
            className="w-full h-14 text-lg shadow-glow-azure"
          >
            {generationStatus === 'generating' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Сгенерировать книгу
              </>
            )}
          </Button>

          {bookStyle === 'custom' && !customStyleDescription.trim() && (
            <p className="text-center text-sm text-azure">
              Опишите желаемый стиль для генерации книги
            </p>
          )}

          {(!stats || stats.total_relatives === 0) && (
            <p className="text-center text-sm text-muted-foreground">
              Добавьте родственников в ваше древо, чтобы создать книгу
            </p>
          )}

          {/* Info */}
          <Card className="border-border bg-muted">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <span className="text-azure font-medium">Примечание:</span> Генерация книги использует искусственный интеллект для создания связного повествования на основе ваших семейных данных и историй.
              </p>
            </CardContent>
          </Card>

          {/* Estimated time */}
          {generationStatus === 'idle' && stats && stats.total_relatives > 0 && (
            <Card className="border-border bg-muted">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 inline mr-2 text-azure" />
                  Примерное время: 1-3 минуты в зависимости от количества родственников
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
