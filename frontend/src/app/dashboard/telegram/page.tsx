'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserCheck,
  UserPlus,
  Copy,
  Send,
  Search,
  Check,
  MessageCircle,
  X,
  QrCode,
  Bot,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUser } from '@/components/providers/UserProvider'
import { familyApi } from '@/lib/api/family'
import { FamilyRelative, InvitationResponse } from '@/types'
import { toast } from 'sonner'

export default function TelegramPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [activatedRelatives, setActivatedRelatives] = useState<FamilyRelative[]>([])
  const [notActivatedRelatives, setNotActivatedRelatives] = useState<FamilyRelative[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRelative, setSelectedRelative] = useState<FamilyRelative | null>(null)
  const [invitationData, setInvitationData] = useState<InvitationResponse | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(false)

  const fetchRelatives = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [activated, notActivated] = await Promise.all([
        familyApi.getActivatedRelatives(user.id),
        familyApi.getNotActivatedRelatives(user.id),
      ])
      setActivatedRelatives(activated)
      setNotActivatedRelatives(notActivated)
    } catch (error) {
      console.error('Error fetching relatives:', error)
      toast.error('Не удалось загрузить родственников')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchRelatives()
  }, [fetchRelatives])

  const handleGenerateInvitation = async (relative: FamilyRelative) => {
    if (!user) return
    setSelectedRelative(relative)
    setInvitationLoading(true)
    try {
      const data = await familyApi.generateInvitation(user.id, relative.id)
      setInvitationData(data)
    } catch (error: any) {
      console.error('Error generating invitation:', error)
      toast.error(error.response?.data?.detail || 'Не удалось создать ссылку-приглашение')
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (invitationData) {
      try {
        await navigator.clipboard.writeText(invitationData.invitation_url)
        toast.success('Ссылка скопирована!')
      } catch {
        toast.error('Не удалось скопировать ссылку')
      }
    }
  }

  const handleShareTelegram = () => {
    if (invitationData && selectedRelative) {
      const text = encodeURIComponent(
        `${selectedRelative.first_name}, вы приглашены присоединиться к нашему семейному древу! Нажмите на ссылку, чтобы начать.`
      )
      const url = encodeURIComponent(invitationData.invitation_url)
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank')
    }
  }

  const handleCloseInvitation = () => {
    setSelectedRelative(null)
    setInvitationData(null)
  }

  const getFullName = (relative: FamilyRelative) =>
    `${relative.last_name || ''} ${relative.first_name || ''}${relative.middle_name ? ` ${relative.middle_name}` : ''}`.trim()

  const getInitials = (relative: FamilyRelative) =>
    `${relative.first_name?.[0] ?? ''}${relative.last_name?.[0] ?? ''}`.toUpperCase()

  const filteredActivated = activatedRelatives.filter(
    (r) =>
      (r.first_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.last_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredNotActivated = notActivatedRelatives.filter(
    (r) =>
      (r.first_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.last_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const defaultTab = activatedRelatives.length > 0 ? 'activated' : 'invite'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-4">
          <Bot className="w-4 h-4 text-orange" />
          <span className="text-sm text-muted-foreground font-medium">Telegram интеграция</span>
        </div>
        <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
          Telegram <span className="gradient-text">приглашения</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Приглашайте родственников в Telegram-бот для сбора семейных историй через интервью.
        </p>
      </div>

      {/* Invitation Detail View */}
      {selectedRelative && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(selectedRelative)}
                </div>
                <div>
                  <h3 className="font-semibold">{getFullName(selectedRelative)}</h3>
                  <p className="text-sm text-muted-foreground">Приглашение в Telegram</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseInvitation}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {invitationLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
              </div>
            ) : invitationData ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Ссылка-приглашение создана!</span>
                </div>

                {/* Link Section */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Ссылка-приглашение:</label>
                  <div className="flex gap-2">
                    <Input
                      value={invitationData.invitation_url}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button onClick={handleCopyLink} className="shrink-0">
                      <Copy className="w-4 h-4 mr-2" />
                      Копировать
                    </Button>
                  </div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-card px-4 text-sm text-muted-foreground">или</span>
                </div>

                {/* Telegram Share */}
                <Button
                  onClick={handleShareTelegram}
                  className="w-full h-12 bg-[#0088cc] hover:bg-[#006699] text-white"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Отправить в Telegram
                </Button>

                <div className="bg-muted p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-2">Как это работает:</p>
                  <ol className="ml-4 space-y-1 text-sm text-muted-foreground list-decimal">
                    <li>Отправьте ссылку родственнику</li>
                    <li>Он перейдёт по ссылке и откроет Telegram бота</li>
                    <li>Бот автоматически активирует его профиль</li>
                    <li>Он сможет добавлять свои воспоминания и истории</li>
                  </ol>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {!selectedRelative && (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск родственников..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="activated" className="flex-1 gap-2">
                <UserCheck className="w-4 h-4" />
                Подключённые ({activatedRelatives.length})
              </TabsTrigger>
              <TabsTrigger value="invite" className="flex-1 gap-2">
                <UserPlus className="w-4 h-4" />
                Пригласить ({notActivatedRelatives.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activated">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
                </div>
              ) : filteredActivated.length > 0 ? (
                <div className="space-y-3">
                  {filteredActivated.map((relative) => (
                    <Card key={relative.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-gradient-to-br ${
                          relative.gender === 'male'
                            ? 'from-blue-500 to-blue-600'
                            : relative.gender === 'female'
                            ? 'from-pink-500 to-pink-600'
                            : 'from-gray-500 to-gray-600'
                        }`}>
                          {getInitials(relative)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{getFullName(relative)}</p>
                          <p className="text-sm text-muted-foreground">
                            {relative.telegram_id ? `@${relative.telegram_id}` : 'Telegram'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
                          <Check className="w-3 h-3 mr-1" />
                          Подключён
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-10 text-center">
                    <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Родственники не найдены' : 'Пока нет подключённых родственников'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="invite">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
                </div>
              ) : filteredNotActivated.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotActivated.map((relative) => (
                    <Card key={relative.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-gradient-to-br ${
                          relative.gender === 'male'
                            ? 'from-blue-500 to-blue-600'
                            : relative.gender === 'female'
                            ? 'from-pink-500 to-pink-600'
                            : 'from-gray-500 to-gray-600'
                        }`}>
                          {getInitials(relative)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{getFullName(relative)}</p>
                          <p className="text-sm text-muted-foreground">Не подключён</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateInvitation(relative)}
                          className="bg-gradient-to-r from-orange to-orange-dark text-white"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Пригласить
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-10 text-center">
                    <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Родственники не найдены' : 'Все родственники подключены!'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
