'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TreePine, ArrowLeft } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'
import TelegramLoginButton from '@/components/auth/TelegramLoginButton'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>('login')

  const handleRegisterSuccess = () => {
    // Switch to login tab after successful registration
    setActiveTab('login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-azure/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-azure-dark/10 rounded-full blur-3xl" />
      </div>

      {/* Back to Home */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-azure transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">На главную</span>
      </Link>

      {/* Auth Card */}
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-azure to-azure-dark flex items-center justify-center transition-transform group-hover:scale-105">
              <TreePine className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-3xl font-bold">
              <span className="text-foreground">Genetic</span><span className="gradient-text">Tree</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-card border border-border p-8 shadow-candy">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2">
              {activeTab === 'login' ? 'Добро пожаловать' : 'Создайте аккаунт'}
            </h1>
            <p className="text-muted-foreground text-base">
              {activeTab === 'login'
                ? 'Войдите, чтобы продолжить работу с семейным древом'
                : 'Начните сохранять историю вашей семьи прямо сейчас'}
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm onSuccess={handleRegisterSuccess} />
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">
                или войти через
              </span>
            </div>
          </div>

          {/* Telegram Login */}
          <TelegramLoginButton
            botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ''}
          />
        </div>

        {/* Footer Text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Защищено современными стандартами шифрования и безопасности
        </p>
      </div>
    </div>
  )
}
