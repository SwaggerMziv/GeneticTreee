import { apiRequest } from './client'
import {
  SubscriptionPlan,
  UserSubscription,
  UsageSummary,
  CheckoutRequest,
  CheckoutResponse,
  PaymentRecord,
} from '@/types'

export const subscriptionApi = {
  // Получить все тарифные планы (публичный)
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    return apiRequest<SubscriptionPlan[]>({
      method: 'GET',
      url: '/api/v1/subscription/plans',
    })
  },

  // Получить текущую подписку
  getMy: async (): Promise<UserSubscription | null> => {
    return apiRequest<UserSubscription | null>({
      method: 'GET',
      url: '/api/v1/subscription/my',
    })
  },

  // Создать платёж (checkout)
  checkout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
    return apiRequest<CheckoutResponse>({
      method: 'POST',
      url: '/api/v1/subscription/checkout',
      data,
    })
  },

  // Отменить подписку
  cancel: async (): Promise<UserSubscription> => {
    return apiRequest<UserSubscription>({
      method: 'POST',
      url: '/api/v1/subscription/cancel',
    })
  },

  // Получить использование и квоты
  getUsage: async (): Promise<UsageSummary> => {
    return apiRequest<UsageSummary>({
      method: 'GET',
      url: '/api/v1/subscription/usage',
    })
  },

  // Синхронизировать статус платежа с ЮKassa
  syncPayment: async (): Promise<{ status: string; synced: boolean }> => {
    return apiRequest<{ status: string; synced: boolean }>({
      method: 'POST',
      url: '/api/v1/subscription/sync-payment',
    })
  },

  // История платежей
  getPayments: async (skip = 0, limit = 50): Promise<PaymentRecord[]> => {
    return apiRequest<PaymentRecord[]>({
      method: 'GET',
      url: `/api/v1/subscription/payments?skip=${skip}&limit=${limit}`,
    })
  },
}
