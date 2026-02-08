'use client'

import { useState } from 'react'
import { Form, Input } from 'antd'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { UserCircle, Lock } from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { LoginFormData, ApiError } from '@/types'
import { isEmail, getErrorMessage } from '@/lib/utils'

interface LoginFormProps {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true)

    try {
      // Determine if identifier is email or username
      const isEmailInput = isEmail(values.identifier)

      const loginData = {
        ...(isEmailInput
          ? { email: values.identifier, username: null }
          : { username: values.identifier, email: null }),
        password: values.password,
      }

      await authApi.login(loginData)

      toast.success('Вы успешно вошли в систему!')
      form.resetFields()

      // Redirect or callback
      if (onSuccess) {
        onSuccess()
      } else {
        // Default redirect to dashboard (to be created later)
        window.location.href = '/dashboard'
      }
    } catch (error) {
      const apiError = error as ApiError
      const errorMessage = getErrorMessage(apiError)
      toast.error(errorMessage)
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      size="large"
      className="space-y-2"
    >
      {/* Username or Email */}
      <Form.Item
        name="identifier"
        label="Имя пользователя или Email"
        rules={[
          {
            required: true,
            message: 'Введите имя пользователя или email',
          },
        ]}
      >
        <Input
          prefix={<UserCircle className="w-4 h-4 text-muted-foreground" />}
          placeholder="username или email@example.com"
          className="h-12"
        />
      </Form.Item>

      {/* Password */}
      <Form.Item
        name="password"
        label="Пароль"
        rules={[
          {
            required: true,
            message: 'Введите пароль',
          },
        ]}
      >
        <Input.Password
          prefix={<Lock className="w-4 h-4 text-muted-foreground" />}
          placeholder="Введите ваш пароль"
          className="h-12"
        />
      </Form.Item>

      {/* Forgot Password Link */}
      <div className="flex justify-end mb-4">
        <a
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-orange transition-colors"
        >
          Забыли пароль?
        </a>
      </div>

      {/* Submit Button */}
      <Form.Item className="mb-0">
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange to-orange-dark text-white hover:shadow-glow-orange transition-all"
        >
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </Form.Item>
    </Form>
  )
}
