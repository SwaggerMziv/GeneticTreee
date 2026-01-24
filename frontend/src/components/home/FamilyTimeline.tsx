'use client'

import { Camera, Calendar, MapPin, Heart, Quote } from 'lucide-react'
import FadeContent from '@/components/ui/FadeContent'
import { motion } from 'framer-motion'

interface TimelinePost {
  id: string
  author: string
  authorRelation: string
  date: string
  location?: string
  title: string
  story: string
  image?: string
  likes: number
}

const timelinePosts: TimelinePost[] = [
  {
    id: '1',
    author: 'Мария Петрова',
    authorRelation: 'Бабушка',
    date: '15 мая 1965',
    location: 'Москва',
    title: 'День нашей свадьбы',
    story: 'Самый счастливый день в моей жизни. Мы поженились в небольшой церкви в центре Москвы. Платье шила сама, а букет собирали с мамой рано утром на рынке. Дедушка выглядел таким красивым в своём костюме.',
    image: '/images/wedding-placeholder.jpg',
    likes: 24,
  },
  {
    id: '2',
    author: 'Алексей Петров',
    authorRelation: 'Сын',
    date: '3 сентября 1985',
    location: 'Санкт-Петербург',
    title: 'Первый день в школе',
    story: 'Помню, как мама собирала меня в первый класс. Новый портфель, белая рубашка и огромный букет цветов. Я так волновался! Учительница Анна Ивановна встретила нас у входа. С того дня началось моё школьное приключение.',
    image: '/images/school-placeholder.jpg',
    likes: 18,
  },
  {
    id: '3',
    author: 'Иван Петров',
    authorRelation: 'Дедушка',
    date: '9 мая 1945',
    location: 'Берлин',
    title: 'День Победы',
    story: 'Этот день я никогда не забуду. Мы стояли на площади и слушали, как объявили о капитуляции. Кто-то плакал, кто-то смеялся, все обнимались. Я думал о доме, о семье. Наконец-то война закончилась, и я мог вернуться домой.',
    image: '/images/victory-placeholder.jpg',
    likes: 42,
  },
]

const TimelineCard = ({ post, index }: { post: TimelinePost; index: number }) => {
  return (
    <FadeContent duration={1000} delay={index * 200} threshold={0.2}>
      <motion.div
        whileHover={{ y: -5 }}
        className="relative rounded-3xl bg-charcoal-800 border border-charcoal-700 overflow-hidden hover:border-orange/50 transition-all group"
      >
        {/* Image Header */}
        <div className="relative h-48 bg-gradient-to-br from-orange/20 to-orange-dark/20 flex items-center justify-center">
          <Camera className="w-16 h-16 text-orange/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-800 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Author Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {post.author.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-white">{post.author}</h4>
              <p className="text-sm text-gray-400">{post.authorRelation}</p>
            </div>
          </div>

          {/* Date and Location */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange" />
              <span>{post.date}</span>
            </div>
            {post.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange" />
                <span>{post.location}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-serif font-bold mb-3 text-white group-hover:text-orange transition-colors">
            {post.title}
          </h3>

          {/* Story */}
          <div className="relative">
            <Quote className="absolute -left-1 -top-1 w-6 h-6 text-orange/20" />
            <p className="text-gray-400 leading-relaxed pl-6">
              {post.story}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center mt-6 pt-4 border-t border-charcoal-700">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span>{post.likes} сердец</span>
            </div>
          </div>
        </div>
      </motion.div>
    </FadeContent>
  )
}

export default function FamilyTimeline() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-orange-dark/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <FadeContent duration={800} threshold={0.2}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-800 border border-charcoal-700 mb-6">
              <Camera className="w-4 h-4 text-orange" />
              <span className="text-sm text-gray-300 font-medium">
                Семейная лента
              </span>
            </div>

            <h2 className="font-serif text-5xl lg:text-6xl font-bold mb-6">
              Истории, которые{' '}
              <span className="gradient-text">объединяют поколения</span>
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              Публикуйте короткие истории о важных моментах жизни ваших родственников.
              Добавляйте фотографии, даты, места. Создавайте живую хронику вашей семьи,
              которая сохранится навсегда.
            </p>
          </div>
        </FadeContent>

        {/* Timeline Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {timelinePosts.map((post, index) => (
            <TimelineCard key={post.id} post={post} index={index} />
          ))}
        </div>

        {/* Features List */}
        <FadeContent duration={1000} delay={600} threshold={0.2}>
          <div className="mt-16 grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-charcoal-800/50 border border-charcoal-700">
              <div className="w-12 h-12 rounded-xl bg-orange/20 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-6 h-6 text-orange" />
              </div>
              <h3 className="font-semibold mb-2">Фотографии</h3>
              <p className="text-sm text-gray-400">
                Прикрепляйте фотографии к историям, чтобы оживить воспоминания
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-charcoal-800/50 border border-charcoal-700">
              <div className="w-12 h-12 rounded-xl bg-orange/20 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-orange" />
              </div>
              <h3 className="font-semibold mb-2">Временная шкала</h3>
              <p className="text-sm text-gray-400">
                Все истории упорядочены по датам, создавая полную хронику семейной жизни
              </p>
            </div>
          </div>
        </FadeContent>

        {/* CTA */}
        <FadeContent duration={800} delay={800} threshold={0.2}>
          <div className="text-center mt-12">
            <p className="text-gray-400 mb-4">
              Начните создавать семейную ленту уже сегодня
            </p>
            <a
              href="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-orange to-orange-dark text-white font-semibold hover:shadow-glow-orange transition-all"
            >
              Создать первую историю
            </a>
          </div>
        </FadeContent>
      </div>
    </section>
  )
}
