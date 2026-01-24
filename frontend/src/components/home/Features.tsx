import {
  Network,
  Search,
  Share2,
  Shield,
  Users,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: Network,
    title: 'Интерактивное древо',
    description:
      'Визуализируйте сложные семейные связи. Добавляйте родственников, создавайте отношения и исследуйте генеалогию.',
  },
  {
    icon: Search,
    title: 'Умный поиск',
    description:
      'Находите родственников по имени, дате рождения, полу или типу родства. Фильтруйте живых и умерших.',
  },
  {
    icon: Share2,
    title: 'Интеграция с Telegram',
    description:
      'Делитесь семейным древом с родственниками через Telegram. Работайте вместе над общей историей семьи.',
  },
  {
    icon: Shield,
    title: 'Безопасность данных',
    description:
      'Данные вашей семьи защищены и приватны. Контролируйте доступ к просмотру и редактированию древа.',
  },
  {
    icon: Users,
    title: 'Совместная работа',
    description:
      'Работайте с членами семьи для создания наиболее полной истории семьи. Каждый может внести свой вклад.',
  },
  {
    icon: Zap,
    title: 'Telegram бот',
    description:
      'Отвечайте на вопросы бота, чтобы собрать историю семьи. Генерируйте ссылки для родственников - каждый может внести свой вклад.',
  },
]

export default function Features() {
  return (
    <section id="features" className="relative py-24 lg:py-32 bg-charcoal-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-serif text-5xl lg:text-6xl font-bold mb-6">
            Всё необходимое для{' '}
            <span className="gradient-text">истории вашей семьи</span>
          </h2>
          <p className="text-xl text-gray-400 leading-relaxed">
            Мощные инструменты для управления семейным древом, совместной работы
            и сохранения семейной истории.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 rounded-3xl bg-charcoal-800 border border-charcoal-700 hover:border-orange/50 transition-all duration-300 hover:shadow-dark-xl animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-white" strokeWidth={2} />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-semibold mb-4 group-hover:text-orange transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
