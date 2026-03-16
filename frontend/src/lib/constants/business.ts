export const BUSINESS_INFO = {
  fullName: 'Бергер Максим Андреевич',
  shortName: 'Бергер М.А.',
  inn: '540537719053',
  status: 'Самозанятый (плательщик налога на профессиональный доход)',
  phone: '+7 (951) 396-75-24',
  email: 'mziv1@mail.ru',
  city: 'Москва',
  country: 'Российская Федерация',
  serviceName: 'GeneticTree',
  serviceUrl: 'genetictree.ru',
} as const

export const PRICING_PLANS = {
  free: {
    name: 'FREE',
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  pro: {
    name: 'PRO',
    monthlyPrice: 299,
    yearlyPrice: 2990,
  },
  premium: {
    name: 'PREMIUM',
    monthlyPrice: 599,
    yearlyPrice: 5990,
  },
} as const
