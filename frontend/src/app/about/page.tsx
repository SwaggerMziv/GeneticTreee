'use client'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { motion } from 'framer-motion'
import { TreePine, Users, MessageCircle, Share2, Lock, Zap, Heart, BookOpen, Camera, History } from 'lucide-react'
import FadeContent from '@/components/ui/FadeContent'
import ShinyText from '@/components/ui/ShinyText'
import GradientBackground from '@/components/ui/GradientBackground'

export default function AboutPage() {
  const features = [
    {
      icon: TreePine,
      title: 'Семейное древо',
      description: 'Создавайте полное генеалогическое древо с неограниченным количеством поколений. Визуализируйте связи между родственниками и отслеживайте 50+ типов родственных отношений.',
    },
    {
      icon: Camera,
      title: 'Семейная лента',
      description: 'Публикуйте короткие истории о ваших родственниках с фотографиями, датами и деталями. Создавайте живую хронику жизни вашей семьи, которая сохранится для будущих поколений.',
    },
    {
      icon: MessageCircle,
      title: 'Telegram интеграция',
      description: 'Приглашайте родственников через Telegram бота. Они смогут заполнить информацию о себе в удобном интерактивном режиме, отвечая на вопросы бота.',
    },
    {
      icon: Share2,
      title: 'Совместная работа',
      description: 'Работайте над семейным древом вместе с родственниками. Каждый может вносить свой вклад, дополнять информацию и делиться воспоминаниями.',
    },
    {
      icon: History,
      title: 'Хронология событий',
      description: 'Отслеживайте важные семейные события: свадьбы, дни рождения, переезды, достижения. Создавайте временную шкалу истории вашей семьи.',
    },
    {
      icon: BookOpen,
      title: 'Семейные истории',
      description: 'Записывайте семейные легенды, анекдоты, воспоминания. Сохраняйте устную историю в письменном виде для будущих поколений.',
    },
    {
      icon: Lock,
      title: 'Приватность данных',
      description: 'Ваши семейные данные защищены современными стандартами шифрования. Вы контролируете, кто имеет доступ к информации о вашей семье.',
    },
    {
      icon: Zap,
      title: 'Быстрый поиск',
      description: 'Мгновенно находите родственников по имени, дате рождения или любой другой информации. Фильтруйте по полу, статусу (живые/умершие) и другим параметрам.',
    },
  ]

  const howItWorks = [
    {
      step: '1',
      title: 'Создайте аккаунт',
      description: 'Зарегистрируйтесь за несколько секунд используя email или Telegram.',
    },
    {
      step: '2',
      title: 'Добавьте первых родственников',
      description: 'Начните с себя, добавьте родителей, братьев, сестер. Укажите базовую информацию: имя, дату рождения, фото.',
    },
    {
      step: '3',
      title: 'Пригласите семью',
      description: 'Отправьте ссылки-приглашения родственникам через Telegram. Они смогут самостоятельно заполнить информацию о себе.',
    },
    {
      step: '4',
      title: 'Заполняйте семейную ленту',
      description: 'Публикуйте истории, фотографии, воспоминания. Создавайте живую хронику вашей семьи.',
    },
  ]

  return (
    <main className="min-h-screen relative">
      <GradientBackground />
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <FadeContent duration={800}>
            <div className="text-center max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-800/80 backdrop-blur-sm border border-charcoal-700 mb-8"
              >
                <Heart className="w-4 h-4 text-orange" />
                <span className="text-sm text-gray-300 font-medium">
                  О проекте GeneticTree
                </span>
              </motion.div>

              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
                Сохраните историю{' '}
                <ShinyText duration={4}>вашей семьи</ShinyText>
              </h1>

              <p className="text-xl text-gray-400 leading-relaxed">
                GeneticTree — это современное приложение для создания и управления семейным древом.
                Мы помогаем семьям по всему миру сохранять свою историю, объединять поколения
                и передавать знания о предках будущим потомкам.
              </p>
            </div>
          </FadeContent>
        </div>
      </section>

      {/* Mission Section */}
      <section className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeContent duration={1000} threshold={0.3}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-6">
                  Наша <span className="gradient-text">миссия</span>
                </h2>
                <div className="space-y-4 text-lg text-gray-400 leading-relaxed">
                  <p>
                    Мы верим, что каждая семья имеет уникальную историю, которая заслуживает быть
                    сохранённой и рассказанной. В эпоху цифровых технологий мы даём семьям
                    инструменты для документирования своей генеалогии простым и доступным способом.
                  </p>
                  <p>
                    GeneticTree создан для того, чтобы связать поколения. Дети должны знать своих
                    прадедушек и прабабушек, понимать, откуда они родом, какие истории стоят за
                    их фамилией.
                  </p>
                  <p>
                    Наша цель — сделать процесс создания семейного древа максимально простым,
                    интересным и вовлекающим для всех членов семьи, независимо от их возраста
                    и технической подкованности.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="relative rounded-3xl bg-gradient-to-br from-orange/20 to-orange-dark/20 p-8 border border-charcoal-700">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-orange" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Для всей семьи</h3>
                        <p className="text-gray-400">
                          Приложение разработано так, чтобы им могли пользоваться все: от детей
                          до бабушек и дедушек.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange/20 flex items-center justify-center flex-shrink-0">
                        <Heart className="w-6 h-6 text-orange" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">С любовью к деталям</h3>
                        <p className="text-gray-400">
                          Мы продумали каждую деталь, чтобы процесс создания древа был приятным
                          и интуитивным.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange/20 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-6 h-6 text-orange" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Безопасность превыше всего</h3>
                        <p className="text-gray-400">
                          Ваши семейные данные защищены современными стандартами безопасности
                          и шифрования.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeContent>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 lg:py-28 bg-charcoal-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeContent duration={800} threshold={0.2}>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-6">
                Возможности <span className="gradient-text">платформы</span>
              </h2>
              <p className="text-xl text-gray-400">
                Всё, что нужно для создания полного и детального семейного древа
              </p>
            </div>
          </FadeContent>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <FadeContent
                key={feature.title}
                duration={800}
                delay={index * 100}
                threshold={0.1}
              >
                <div className="p-6 rounded-2xl bg-charcoal-800/50 border border-charcoal-700 hover:border-orange/50 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-orange/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-orange" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </FadeContent>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeContent duration={800} threshold={0.3}>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-6">
                Как это <span className="gradient-text">работает</span>
              </h2>
              <p className="text-xl text-gray-400">
                Создать семейное древо легко — следуйте этим простым шагам
              </p>
            </div>
          </FadeContent>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <FadeContent
                key={item.step}
                duration={1000}
                delay={index * 150}
                threshold={0.2}
              >
                <div className="relative">
                  {/* Connection Line */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-orange/50 to-transparent" />
                  )}

                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center mb-6 mx-auto shadow-glow-orange">
                      <span className="font-serif text-4xl font-bold text-white">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-center">{item.title}</h3>
                    <p className="text-gray-400 text-center leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </FadeContent>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 lg:py-28 bg-charcoal-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeContent duration={1000} threshold={0.3}>
            <div className="relative rounded-4xl bg-gradient-to-br from-orange to-orange-dark p-1">
              <div className="rounded-4xl bg-charcoal-900 p-12 lg:p-16">
                <div className="max-w-3xl mx-auto text-center">
                  <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-6">
                    Начните сохранять историю семьи уже сегодня
                  </h2>
                  <p className="text-xl text-gray-400 leading-relaxed mb-8">
                    Каждый день мы теряем уникальные воспоминания и истории наших близких.
                    Не позвольте времени стереть память о ваших предках. Создайте семейное древо
                    прямо сейчас и сохраните наследие вашей семьи для будущих поколений.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <a
                      href="/auth"
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-orange to-orange-dark text-white font-semibold hover:shadow-glow-orange transition-all"
                    >
                      Создать аккаунт бесплатно
                    </a>
                    <a
                      href="/"
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-charcoal-800 border border-charcoal-700 text-white font-semibold hover:border-orange/50 transition-all"
                    >
                      Узнать больше
                    </a>
                  </div>
                  <p className="mt-6 text-sm text-gray-500">
                    Регистрация занимает менее минуты. Никаких скрытых платежей.
                  </p>
                </div>
              </div>
            </div>
          </FadeContent>
        </div>
      </section>

      <Footer />
    </main>
  )
}
