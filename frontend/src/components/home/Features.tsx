import {
  Network,
  Bot,
  BookOpen,
  FileText,
  Sparkles,
  Camera,
} from 'lucide-react'

const features = [
  {
    icon: Network,
    title: 'Интерактивное древо',
    description:
      'Визуальный редактор с 50+ типами родственных связей. Добавляйте родственников, создавайте отношения и исследуйте генеалогию.',
    color: 'from-[#8ECAE6] to-[#6BC4DD]',
  },
  {
    icon: Sparkles,
    title: 'ИИ-ассистент',
    description:
      'Просто напишите «Добавь маму Анна 1965» — ИИ создаст родственника, свяжет его и заполнит данные. Управление древом голосом.',
    color: 'from-[#D4B5E8] to-[#B8A9D4]',
  },
  {
    icon: Bot,
    title: 'Telegram бот',
    description:
      'ИИ-бот проводит интервью с родственниками, задаёт вопросы о жизни и записывает их воспоминания. Поддерживает голосовые сообщения.',
    color: 'from-[#FFB49A] to-[#ED7855]',
  },
  {
    icon: Camera,
    title: 'Истории с фото',
    description:
      'Все рассказы сохраняются автоматически. Добавляйте фотографии, даты и места к воспоминаниям. Фото попадают прямо в книгу.',
    color: 'from-[#F2BDD4] to-[#E8A0BE]',
  },
  {
    icon: FileText,
    title: 'PDF книга',
    description:
      'Генерируйте книгу с титульной страницей, оглавлением, семейным древом, хронологией, главами с фото и заключением.',
    color: 'from-[#FFDD93] to-[#F5C964]',
  },
  {
    icon: BookOpen,
    title: 'Стили оформления',
    description:
      'Классический, современный или винтажный стиль. Светлая и тёмная тема. Декоративные орнаменты и карточки родственников.',
    color: 'from-[#C5E1A5] to-[#A8D08D]',
  },
]

export default function Features() {
  return (
    <section id="features" className="relative py-24 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-serif text-5xl lg:text-6xl font-bold mb-6">
            Всё необходимое для{' '}
            <span className="gradient-text">семейной книги</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            От построения древа до готовой книги — все инструменты в одном месте.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md hover:border-azure/30 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-semibold mb-4 group-hover:text-azure transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
