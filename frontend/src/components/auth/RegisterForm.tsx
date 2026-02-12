'use client'

import { useState } from 'react'
import { Form, Input } from 'antd'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { User, Mail, Lock } from 'lucide-react'
import { usersApi } from '@/lib/api/users'
import { RegisterFormData, ApiError } from '@/types'
import { validatePassword, validateUsername, getErrorMessage } from '@/lib/utils'

interface RegisterFormProps {
  onSuccess?: () => void
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: RegisterFormData) => {
    setLoading(true)

    try {
      // Validate password
      const passwordValidation = validatePassword(values.password)
      if (!passwordValidation.isValid) {
        toast.error(passwordValidation.errors[0])
        setLoading(false)
        return
      }

      // Validate username
      const usernameValidation = validateUsername(values.username)
      if (!usernameValidation.isValid) {
        toast.error(usernameValidation.errors[0])
        setLoading(false)
        return
      }

      // Check if passwords match
      if (values.password !== values.confirmPassword) {
        toast.error('Пароли не совпадают')
        setLoading(false)
        return
      }

      // Create user
      await usersApi.create({
        username: values.username,
        email: values.email,
        password: values.password,
      })

      toast.success('Аккаунт успешно создан! Теперь войдите.')
      form.resetFields()

      // Call success callback or redirect
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      const apiError = error as ApiError
      const errorMessage = getErrorMessage(apiError)
      toast.error(errorMessage)
      console.error('Registration error:', error)
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
      {/* Username */}
      <Form.Item
        name="username"
        label="Имя пользователя"
        rules={[
          {
            required: true,
            message: 'Введите имя пользователя',
          },
          {
            min: 3,
            message: 'Минимум 3 символа',
          },
          {
            max: 20,
            message: 'Максимум 20 символов',
          },
          {
            pattern: /^[a-zA-Z0-9_]+$/,
            message: 'Только буквы, цифры и подчёркивание',
          },
        ]}
      >
        <Input
          prefix={<User className="w-4 h-4 text-muted-foreground" />}
          placeholder="Выберите имя пользователя"
          className="h-12"
        />
      </Form.Item>

      {/* Email */}
      <Form.Item
        name="email"
        label="Email"
        rules={[
          {
            required: true,
            message: 'Введите email',
          },
          {
            type: 'email',
            message: 'Введите корректный email',
          },
        ]}
      >
        <Input
          prefix={<Mail className="w-4 h-4 text-muted-foreground" />}
          placeholder="email@example.com"
          type="email"
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
          {
            min: 8,
            message: 'Минимум 8 символов',
          },
          {
            max: 32,
            message: 'Максимум 32 символа',
          },
        ]}
      >
        <Input.Password
          prefix={<Lock className="w-4 h-4 text-muted-foreground" />}
          placeholder="Создайте надёжный пароль"
          className="h-12"
        />
      </Form.Item>

      {/* Confirm Password */}
      <Form.Item
        name="confirmPassword"
        label="Подтвердите пароль"
        dependencies={['password']}
        rules={[
          {
            required: true,
            message: 'Подтвердите пароль',
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
              }
              return Promise.reject(new Error('Пароли не совпадают'))
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<Lock className="w-4 h-4 text-muted-foreground" />}
          placeholder="Повторите пароль"
          className="h-12"
        />
      </Form.Item>

      {/* Submit Button */}
      <Form.Item className="mb-0 pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-azure to-azure-dark text-white hover:shadow-glow-azure transition-all"
        >
          {loading ? 'Создание аккаунта...' : 'Создать аккаунт'}
        </Button>
      </Form.Item>

      {/* Terms */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        Создавая аккаунт, вы соглашаетесь с{' '}
        <a href="/terms" className="text-azure hover:underline">
          Условиями использования
        </a>{' '}
        и{' '}
        <a href="/privacy" className="text-azure hover:underline">
          Политикой конфиденциальности
        </a>
        .
      </p>
    </Form>
  )
}
