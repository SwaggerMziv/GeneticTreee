'use client'

import { Camera, Calendar, MapPin, Quote, ArrowRight } from 'lucide-react'
import FadeContent from '@/components/ui/FadeContent'

interface StoryPreview {
  id: string
  author: string
  authorRelation: string
  date: string
  location?: string
  title: string
  story: string
}

const storyPreviews: StoryPreview[] = [
  {
    id: '1',
    author: 'Мария Петрова',
    authorRelation: 'Бабушка',
    date: '15 мая 1965',
    location: 'Москва',
    title: 'День нашей свадьбы',
    story: 'Самый счастливый день в моей жизни. Мы поженились в небольшой церкви в центре Москвы. Платье шила сама, а букет собирали с мамой рано утром на рынке.',
  },
  {
    id: '2',
    author: 'Алексей Петров',
    authorRelation: 'Сын',
    date: '3 сентября 1985',
    location: 'Санкт-Петербург',
    title: 'Первый день в школе',
    story: 'Помню, как мама собирала меня в первый класс. Новый портфель, белая рубашка и огромный букет цветов. Учительница встретила нас у входа.',
  },
  {
    id: '3',
    author: 'Иван Петров',
    authorRelation: 'Дедушка',
    date: '9 мая 1945',
    location: 'Берлин',
    title: 'День Победы',
    story: 'Этот день я никогда не забуду. Мы стояли на площади и слушали, как объявили о капитуляции. Кто-то плакал, кто-то смеялся, все обнимались.',
  },
]

export default function FamilyTimeline() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-orange-dark/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <FadeContent duration={800} threshold={0.2}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border mb-6">
              <Camera className="w-4 h-4 text-orange" />
              <span className="text-sm text-muted-foreground font-medium">
                Страницы будущей книги
              </span>
            </div>

            <h2 className="font-serif text-5xl lg:text-6xl font-bold mb-6">
              Истории становятся{' '}
              <span className="gradient-text">страницами книги</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Каждое интервью с родственником превращается в главу вашей семейной книги.
            </p>
          </div>
        </FadeContent>

        {/* Story Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {storyPreviews.map((post, index) => (
            <FadeContent key={post.id} duration={1000} delay={index * 200} threshold={0.2}>
              <div className="relative rounded-3xl bg-card border border-border overflow-hidden hover:border-orange/50 transition-all group">
                {/* Image Header */}
                <div className="relative h-40 bg-gradient-to-br from-orange/20 to-orange-dark/20 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-orange/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>

                <div className="p-6">
                  {/* Author */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {post.author.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{post.author}</h4>
                      <p className="text-sm text-muted-foreground">{post.authorRelation}</p>
                    </div>
                  </div>

                  {/* Date and Location */}
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted-foreground">
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

                  <h3 className="text-lg font-serif font-bold mb-3 group-hover:text-orange transition-colors">
                    {post.title}
                  </h3>

                  <div className="relative">
                    <Quote className="absolute -left-1 -top-1 w-5 h-5 text-orange/20" />
                    <p className="text-muted-foreground leading-relaxed text-sm pl-5">
                      {post.story}
                    </p>
                  </div>
                </div>
              </div>
            </FadeContent>
          ))}
        </div>

        <FadeContent duration={800} delay={600} threshold={0.2}>
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <span>Эти истории станут главами вашей книги</span>
              <ArrowRight className="w-4 h-4 text-orange" />
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  )
}
