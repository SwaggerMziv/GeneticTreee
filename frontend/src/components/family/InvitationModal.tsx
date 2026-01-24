'use client'

import { useState } from 'react'
import { Modal, Button, Input, message, QRCode, Space, Typography, Divider } from 'antd'
import { CopyOutlined, SendOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { MessageCircle } from 'lucide-react'
import { familyApi } from '@/lib/api/family'
import { InvitationResponse } from '@/types'

const { Title, Text, Paragraph } = Typography

interface InvitationModalProps {
  visible: boolean
  onClose: () => void
  relativeId: number
  relativeName: string
  userId: number
}

export default function InvitationModal({
  visible,
  onClose,
  relativeId,
  relativeName,
  userId,
}: InvitationModalProps) {
  const [loading, setLoading] = useState(false)
  const [invitationData, setInvitationData] = useState<InvitationResponse | null>(null)

  const handleGenerateInvitation = async () => {
    setLoading(true)
    try {
      const data = await familyApi.generateInvitation(userId, relativeId)
      setInvitationData(data)
      message.success('Ссылка-приглашение успешно создана!')
    } catch (error: any) {
      console.error('Error generating invitation:', error)
      message.error(error.response?.data?.detail || 'Не удалось создать ссылку-приглашение')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToClipboard = async () => {
    if (invitationData) {
      try {
        await navigator.clipboard.writeText(invitationData.invitation_url)
        message.success('Ссылка скопирована в буфер обмена!')
      } catch (error) {
        message.error('Не удалось скопировать ссылку')
      }
    }
  }

  const handleShareTelegram = () => {
    if (invitationData) {
      const text = encodeURIComponent(
        `${relativeName}, вы приглашены присоединиться к нашему семейному древу! Нажмите на ссылку, чтобы начать.`
      )
      const url = encodeURIComponent(invitationData.invitation_url)
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank')
    }
  }

  const handleModalClose = () => {
    setInvitationData(null)
    onClose()
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SendOutlined className="text-blue-500" />
          <span className="text-white">Пригласить родственника в Telegram</span>
        </div>
      }
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={600}
      centered
    >
      <div className="py-4">
        {!invitationData ? (
          <div className="text-center space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
              <Title level={4} className="!mb-2 !text-gray-900">
                {relativeName}
              </Title>
              <Paragraph className="!text-gray-800 mb-0">
                Создайте уникальную ссылку-приглашение для отправки родственнику в Telegram.
                После перехода по ссылке бот автоматически активирует пользователя и начнет интервью.
              </Paragraph>
            </div>

            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              loading={loading}
              onClick={handleGenerateInvitation}
              className="!h-12 !text-base"
            >
              Создать ссылку-приглашение
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
              <CheckCircleOutlined className="text-xl" />
              <Text strong className="!text-gray-900">
                Ссылка успешно создана!
              </Text>
            </div>

            <div className="space-y-3">
              <div>
                <Text strong className="block mb-2 !text-white">
                  Ссылка для приглашения:
                </Text>
                <Space.Compact className="w-full">
                  <Input
                    value={invitationData.invitation_url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="primary"
                    icon={<CopyOutlined />}
                    onClick={handleCopyToClipboard}
                  >
                    Копировать
                  </Button>
                </Space.Compact>
              </div>

              <Divider className="!my-4 !text-gray-700">или отсканируйте QR-код</Divider>

              <div className="flex justify-center p-4 bg-white rounded-lg border border-gray-200">
                <QRCode
                  value={invitationData.invitation_url}
                  size={200}
                  bordered={false}
                  errorLevel="H"
                  color="#000000"
                  bgColor="#FFFFFF"
                />
              </div>

              <Divider className="!my-4 !text-gray-700">или отправьте напрямую</Divider>

              <Button
                type="primary"
                icon={<MessageCircle className="w-4 h-4" />}
                onClick={handleShareTelegram}
                className="w-full !h-12 !bg-[#0088cc] hover:!bg-[#006699] !border-none"
                size="large"
              >
                Отправить в Telegram
              </Button>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                <Text className="text-sm !text-gray-900">
                  <strong className="text-gray-900">Инструкция:</strong>
                  <ol className="mt-2 ml-4 space-y-1 text-gray-800">
                    <li>Отправьте эту ссылку родственнику</li>
                    <li>При переходе по ссылке откроется Telegram бот</li>
                    <li>Бот активирует пользователя автоматически</li>
                    <li>Начнется интервью для сбора информации о жизни</li>
                  </ol>
                </Text>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={handleModalClose}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
