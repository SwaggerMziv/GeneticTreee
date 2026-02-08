'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal, Button, List, Avatar, Tag, Input, Space, Spin, Empty, message, QRCode, Divider, Tabs } from 'antd'
import {
  UserCheck,
  UserPlus,
  Copy,
  Send,
  QrCode,
  Search,
  X,
  Check,
  MessageCircle,
} from 'lucide-react'
import { familyApi } from '@/lib/api/family'
import { FamilyRelative, InvitationResponse } from '@/types'

interface ActivatedRelativesModalProps {
  visible: boolean
  onClose: () => void
  userId: number
  activatedCount: number
}

export default function ActivatedRelativesModal({
  visible,
  onClose,
  userId,
  activatedCount,
}: ActivatedRelativesModalProps) {
  const [loading, setLoading] = useState(false)
  const [activatedRelatives, setActivatedRelatives] = useState<FamilyRelative[]>([])
  const [notActivatedRelatives, setNotActivatedRelatives] = useState<FamilyRelative[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRelative, setSelectedRelative] = useState<FamilyRelative | null>(null)
  const [invitationData, setInvitationData] = useState<InvitationResponse | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(activatedCount > 0 ? 'activated' : 'invite')

  const fetchRelatives = useCallback(async () => {
    setLoading(true)
    try {
      const [activated, notActivated] = await Promise.all([
        familyApi.getActivatedRelatives(userId),
        familyApi.getNotActivatedRelatives(userId),
      ])
      setActivatedRelatives(activated)
      setNotActivatedRelatives(notActivated)
    } catch (error) {
      console.error('Error fetching relatives:', error)
      message.error('Не удалось загрузить родственников')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (visible) {
      fetchRelatives()
      setActiveTab(activatedCount > 0 ? 'activated' : 'invite')
    }
  }, [visible, activatedCount, fetchRelatives])

  const handleGenerateInvitation = async (relative: FamilyRelative) => {
    setSelectedRelative(relative)
    setInvitationLoading(true)
    try {
      const data = await familyApi.generateInvitation(userId, relative.id)
      setInvitationData(data)
    } catch (error: any) {
      console.error('Error generating invitation:', error)
      message.error(error.response?.data?.detail || 'Не удалось создать ссылку-приглашение')
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (invitationData) {
      try {
        await navigator.clipboard.writeText(invitationData.invitation_url)
        message.success('Ссылка скопирована!')
      } catch {
        message.error('Не удалось скопировать ссылку')
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

  const handleModalClose = () => {
    setSelectedRelative(null)
    setInvitationData(null)
    setSearchTerm('')
    onClose()
  }

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

  const getFullName = (relative: FamilyRelative) =>
    `${relative.last_name} ${relative.first_name}${relative.middle_name ? ` ${relative.middle_name}` : ''}`

  const getInitials = (relative: FamilyRelative) =>
    `${relative.first_name?.[0] ?? ''}${relative.last_name?.[0] ?? ''}`.toUpperCase()

  const renderRelativeItem = (relative: FamilyRelative, showInviteButton: boolean) => (
    <List.Item
      key={relative.id}
      className="!border-charcoal-700 hover:bg-charcoal-800/50 rounded-lg transition-colors !px-4"
      actions={
        showInviteButton
          ? [
              <Button
                key="invite"
                type="primary"
                size="small"
                icon={<Send className="w-3 h-3" />}
                onClick={() => handleGenerateInvitation(relative)}
                className="!text-xs"
              >
                Пригласить
              </Button>,
            ]
          : [
              <Tag key="status" color="green" className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                Подключён
              </Tag>,
            ]
      }
    >
      <List.Item.Meta
        avatar={
          relative.image_url ? (
            <Avatar src={relative.image_url} size={40} />
          ) : (
            <Avatar
              size={40}
              className={`!bg-gradient-to-br ${
                relative.gender === 'male'
                  ? 'from-blue-500 to-blue-600'
                  : relative.gender === 'female'
                  ? 'from-pink-500 to-pink-600'
                  : 'from-gray-500 to-gray-600'
              }`}
            >
              {getInitials(relative)}
            </Avatar>
          )
        }
        title={<span className="text-white font-medium">{getFullName(relative)}</span>}
        description={
          <span className="text-gray-400 text-sm">
            {relative.telegram_id ? `@${relative.telegram_id}` : 'Нет Telegram'}
          </span>
        }
      />
    </List.Item>
  )

  const renderInvitationView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="text"
            icon={<X className="w-4 h-4" />}
            onClick={handleCloseInvitation}
            className="!text-gray-400 hover:!text-white"
          />
          <span className="text-white font-medium">{getFullName(selectedRelative!)}</span>
        </div>
      </div>

      {invitationLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : invitationData ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
            <Check className="w-5 h-5" />
            <span className="font-medium">Ссылка-приглашение создана!</span>
          </div>

          {/* Link Section */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Ссылка-приглашение:</label>
            <Space.Compact className="w-full">
              <Input
                value={invitationData.invitation_url}
                readOnly
                className="font-mono text-xs !bg-charcoal-800 !border-charcoal-600"
              />
              <Button type="primary" icon={<Copy className="w-4 h-4" />} onClick={handleCopyLink}>
                Копировать
              </Button>
            </Space.Compact>
          </div>

          <Divider className="!border-charcoal-700 !my-4">или</Divider>

          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCode
              value={invitationData.invitation_url}
              size={180}
              bordered={false}
              errorLevel="H"
              color="#000000"
              bgColor="#FFFFFF"
            />
          </div>

          <Divider className="!border-charcoal-700 !my-4">или</Divider>

          {/* Telegram Share */}
          <Button
            type="primary"
            icon={<MessageCircle className="w-4 h-4" />}
            onClick={handleShareTelegram}
            className="w-full !h-12 !bg-[#0088cc] hover:!bg-[#006699] !border-none"
            size="large"
          >
            Отправить в Telegram
          </Button>

          <div className="bg-charcoal-800 p-4 rounded-lg border border-charcoal-700">
            <p className="text-sm text-gray-400">
              <strong className="text-gray-300">Как это работает:</strong>
            </p>
            <ol className="mt-2 ml-4 space-y-1 text-sm text-gray-400 list-decimal">
              <li>Отправьте ссылку родственнику</li>
              <li>Он перейдёт по ссылке и откроет Telegram бота</li>
              <li>Бот автоматически активирует его профиль</li>
              <li>Он сможет добавлять свои воспоминания и истории</li>
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  )

  const renderListView = () => (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Поиск родственников..."
        prefix={<Search className="w-4 h-4 text-gray-400" />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="!bg-charcoal-800 !border-charcoal-600"
        allowClear
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'activated',
            label: (
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Подключённые ({activatedRelatives.length})
              </span>
            ),
            children: loading ? (
              <div className="flex justify-center py-8">
                <Spin size="large" />
              </div>
            ) : filteredActivated.length > 0 ? (
              <List
                className="max-h-[400px] overflow-y-auto"
                dataSource={filteredActivated}
                renderItem={(item) => renderRelativeItem(item, false)}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-gray-400">
                    {searchTerm ? 'Родственники не найдены' : 'Пока нет подключённых родственников'}
                  </span>
                }
              />
            ),
          },
          {
            key: 'invite',
            label: (
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Пригласить ({notActivatedRelatives.length})
              </span>
            ),
            children: loading ? (
              <div className="flex justify-center py-8">
                <Spin size="large" />
              </div>
            ) : filteredNotActivated.length > 0 ? (
              <List
                className="max-h-[400px] overflow-y-auto"
                dataSource={filteredNotActivated}
                renderItem={(item) => renderRelativeItem(item, true)}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-gray-400">
                    {searchTerm ? 'Родственники не найдены' : 'Все родственники подключены!'}
                  </span>
                }
              />
            ),
          },
        ]}
      />
    </div>
  )

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {selectedRelative ? (
            <Send className="w-5 h-5 text-blue-500" />
          ) : (
            <UserCheck className="w-5 h-5 text-green-500" />
          )}
          <span className="text-white">
            {selectedRelative ? 'Пригласить в Telegram' : 'Подключённые родственники'}
          </span>
        </div>
      }
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={500}
      centered
      className="family-modal"
    >
      {selectedRelative ? renderInvitationView() : renderListView()}
    </Modal>
  )
}
