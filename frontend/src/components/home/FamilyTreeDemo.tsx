'use client'

import { User, Heart, Minus } from 'lucide-react'
import GlareHover from '@/components/ui/GlareHover'
import FadeContent from '@/components/ui/FadeContent'

interface Person {
  id: string
  firstName: string
  lastName: string
  years: string
  gender: 'male' | 'female'
  alive: boolean
}

interface FamilyMemberCardProps {
  person: Person
  size?: 'sm' | 'md'
}

const FamilyMemberCard = ({ person, size = 'md' }: FamilyMemberCardProps) => {
  const isSmall = size === 'sm'

  return (
    <GlareHover
      width={isSmall ? '140px' : '160px'}
      height={isSmall ? '90px' : '100px'}
      background="hsl(var(--card))"
      borderRadius="16px"
      borderColor="hsl(var(--border))"
      glareColor="#6BC4DD"
      glareOpacity={0.3}
      transitionDuration={500}
      className="shadow-dark-lg hover:shadow-dark-xl transition-shadow"
    >
      <div className="flex flex-col items-center justify-center p-3 text-center h-full">
        <div
          className={`${isSmall ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center mb-2 ${
            person.gender === 'male'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-pink-500/20 text-pink-400'
          }`}
        >
          <User className={isSmall ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>
        <h4 className={`${isSmall ? 'text-xs' : 'text-sm'} font-semibold text-white mb-1 leading-tight`}>
          {person.firstName} {person.lastName}
        </h4>
        <p className="text-xs text-gray-400">{person.years}</p>
        {!person.alive && (
          <div className="mt-1 text-xs text-gray-500">✝</div>
        )}
      </div>
    </GlareHover>
  )
}

const ConnectionLine = ({
  type = 'vertical',
  length = 12
}: {
  type?: 'vertical' | 'horizontal' | 'branch'
  length?: number
}) => {
  if (type === 'horizontal') {
    return <div className={`h-0.5 w-${length} bg-gradient-to-r from-border via-azure/50 to-border`} />
  }

  if (type === 'branch') {
    return (
      <div className="flex flex-col items-center">
        <div className={`w-0.5 h-8 bg-gradient-to-b from-azure/50 to-border`} />
        <div className="flex items-center">
          <div className="w-24 h-0.5 bg-border" />
          <div className="w-0.5 h-4 bg-border" />
          <div className="w-24 h-0.5 bg-border" />
        </div>
      </div>
    )
  }

  return <div className={`w-0.5 h-${length} bg-gradient-to-b from-border to-azure/50`} />
}

export default function FamilyTreeDemo() {
  // Grandparents (прадедушка и прабабушка)
  const greatGrandparents: Person[] = [
    { id: '1', firstName: 'Иван', lastName: 'Петров', years: '1935-2010', gender: 'male', alive: false },
    { id: '2', firstName: 'Мария', lastName: 'Петрова', years: '1938-2015', gender: 'female', alive: false },
    { id: '3', firstName: 'Николай', lastName: 'Иванов', years: '1940-2018', gender: 'male', alive: false },
    { id: '4', firstName: 'Анна', lastName: 'Иванова', years: '1942-н.в.', gender: 'female', alive: true }
  ]

  // Parents (родители)
  const parents: Person[] = [
    { id: '5', firstName: 'Сергей', lastName: 'Петров', years: '1960-н.в.', gender: 'male', alive: true },
    { id: '6', firstName: 'Елена', lastName: 'Петрова', years: '1963-н.в.', gender: 'female', alive: true }
  ]

  // Siblings (братья и сестры)
  const siblings: Person[] = [
    { id: '7', firstName: 'Алексей', lastName: 'Петров', years: '1985-н.в.', gender: 'male', alive: true },
    { id: '8', firstName: 'Наталья', lastName: 'Петрова', years: '1987-н.в.', gender: 'female', alive: true },
    { id: '9', firstName: 'Дмитрий', lastName: 'Петров', years: '1990-н.в.', gender: 'male', alive: true }
  ]

  return (
    <section className="relative py-24 lg:py-32 bg-background overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-azure/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-azure-dark/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <FadeContent duration={800} threshold={0.2}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-5xl lg:text-6xl font-bold mb-6">
              Визуализация{' '}
              <span className="gradient-text">вашей истории</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Интерактивное семейное древо с типизированными связями между родственниками.
            </p>
          </div>
        </FadeContent>

        {/* Family Tree Visualization */}
        <div className="relative max-w-6xl mx-auto">
          {/* Great Grandparents Generation (Прадедушка и Прабабушка) */}
          <FadeContent duration={1000} delay={200} threshold={0.2}>
            <div className="flex justify-center items-start gap-24 mb-6">
              {/* Paternal Side */}
              <div className="flex items-center gap-4">
                <FamilyMemberCard person={greatGrandparents[0]} size="sm" />
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <FamilyMemberCard person={greatGrandparents[1]} size="sm" />
              </div>

              {/* Maternal Side */}
              <div className="flex items-center gap-4">
                <FamilyMemberCard person={greatGrandparents[2]} size="sm" />
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <FamilyMemberCard person={greatGrandparents[3]} size="sm" />
              </div>
            </div>
          </FadeContent>

          {/* Connection Lines from Grandparents to Parents */}
          <FadeContent duration={800} delay={400} threshold={0.2}>
            <div className="flex justify-center items-center gap-24 mb-6">
              <div className="w-0.5 h-10 bg-gradient-to-b from-border to-azure/50" />
              <div className="w-0.5 h-10 bg-gradient-to-b from-border to-azure/50" />
            </div>
          </FadeContent>

          {/* Parents Generation */}
          <FadeContent duration={1000} delay={600} threshold={0.2}>
            <div className="flex justify-center items-center gap-8 mb-6">
              <div className="flex items-center gap-6">
                <FamilyMemberCard person={parents[0]} />
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                <FamilyMemberCard person={parents[1]} />
              </div>
            </div>
          </FadeContent>

          {/* Connection Line to Children */}
          <FadeContent duration={800} delay={800} threshold={0.2}>
            <div className="flex justify-center mb-6">
              <div className="w-0.5 h-10 bg-gradient-to-b from-azure/50 to-border" />
            </div>
          </FadeContent>

          {/* Children/Siblings Generation */}
          <FadeContent duration={1000} delay={1000} threshold={0.2}>
            <div className="flex justify-center items-center gap-8 mb-6">
              {siblings.map((sibling, index) => (
                <div key={sibling.id} className="flex items-center gap-6">
                  <FamilyMemberCard person={sibling} />
                  {index < siblings.length - 1 && (
                    <Minus className="w-6 h-6 text-border" />
                  )}
                </div>
              ))}
            </div>
          </FadeContent>

          {/* Relationship Labels */}
          <FadeContent duration={800} delay={1200} threshold={0.2}>
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
              <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Тип связи</div>
                <div className="text-azure font-semibold">Родители ↔ Дети</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Тип связи</div>
                <div className="text-azure font-semibold">Братья ↔ Сестры</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Тип связи</div>
                <div className="text-azure font-semibold">Супруги</div>
              </div>
            </div>
          </FadeContent>
        </div>

        {/* Info Text */}
        <FadeContent duration={800} delay={1400} threshold={0.2}>
          <div className="text-center mt-16">
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              В реальном приложении вы сможете создавать{' '}
              <span className="text-azure font-semibold">50+ типов родственных связей</span>
              : родители, бабушки/дедушки, дяди/тети, двоюродные братья/сестры, племянники,
              прадедушки/прабабушки и многие другие. Система поддерживает сложные генеалогические
              структуры и автоматически определяет обратные связи.
            </p>
          </div>
        </FadeContent>
      </div>
    </section>
  )
}
