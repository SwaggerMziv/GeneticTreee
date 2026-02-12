'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Steps } from 'antd'
import {
  BookOpen,
  UserPlus,
  Link2,
  Search,
  Edit,
  Trash2,
  Users,
  ArrowRight,
  Info,
  Lightbulb,
  TreePine,
} from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export default function GuidePage() {
  const router = useRouter()
  const { user } = useUser()
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: 'Добавление себя',
      icon: <UserPlus className="w-5 h-5" />,
      description: 'Начните с добавления себя как первого члена семьи',
    },
    {
      title: 'Добавление родителей',
      icon: <Users className="w-5 h-5" />,
      description: 'Добавьте своих родителей и свяжите их с собой',
    },
    {
      title: 'Расширение древа',
      icon: <TreePine className="w-5 h-5" />,
      description: 'Добавляйте братьев, сестёр, бабушек, дедушек',
    },
    {
      title: 'Добавление историй',
      icon: <BookOpen className="w-5 h-5" />,
      description: 'Обогатите профили семейными историями',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border shadow-sm mb-4">
          <BookOpen className="w-4 h-4 text-azure" />
          <span className="text-sm text-muted-foreground font-medium">
            Руководство
          </span>
        </div>
        <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
          Как создать <span className="gradient-text">семейное древо</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Пошаговая инструкция по созданию и управлению вашим семейным древом
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="mb-12 border-border bg-card">
        <CardContent className="p-6">
          <h3 className="font-serif text-xl font-bold mb-6 text-foreground">
            Основные этапы
          </h3>
          <Steps
            current={currentStep}
            onChange={setCurrentStep}
            items={steps.map((step) => ({
              title: step.title,
              description: step.description,
              icon: step.icon,
            }))}
            className="custom-steps"
          />
        </CardContent>
      </Card>

      {/* Detailed Guide */}
      <div className="mb-12">
        <h3 className="font-serif text-2xl font-bold mb-6 text-foreground">
          Подробное руководство
        </h3>
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <Accordion type="multiple" defaultValue={['1']}>
              <AccordionItem value="1">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-azure/20">
                      <UserPlus className="w-5 h-5 text-azure" />
                    </div>
                    <span className="font-medium text-foreground">Шаг 1: Добавление первого родственника</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Начните с добавления себя или любого члена семьи, от которого будет строиться древо.
                    </p>
                    <div className="p-4 rounded-xl bg-muted border border-border shadow-sm">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Как добавить родственника:
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Перейдите на страницу &ldquo;Семейное древо&rdquo;</li>
                        <li>Нажмите кнопку &ldquo;Добавить родственника&rdquo;</li>
                        <li>Заполните основную информацию: имя, фамилию, дату рождения</li>
                        <li>Укажите пол и дополнительную информацию при необходимости</li>
                        <li>Нажмите &ldquo;Сохранить&rdquo;</li>
                      </ol>
                    </div>
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                      <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Совет:
                      </h4>
                      <p className="text-sm">
                        Добавляйте как можно больше информации сразу — это поможет в дальнейшей работе с древом и генерации семейной книги.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="2">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-azure/20">
                      <Link2 className="w-5 h-5 text-azure" />
                    </div>
                    <span className="font-medium text-foreground">Шаг 2: Создание связей между родственниками</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      После добавления нескольких родственников, необходимо указать их взаимоотношения.
                    </p>
                    <div className="p-4 rounded-xl bg-muted border border-border shadow-sm">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Типы связей:
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>• Отец / Мать</div>
                        <div>• Сын / Дочь</div>
                        <div>• Брат / Сестра</div>
                        <div>• Дедушка / Бабушка</div>
                        <div>• Муж / Жена</div>
                        <div>• Дядя / Тётя</div>
                        <div>• Племянник / Племянница</div>
                        <div>• Кузен / Кузина</div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted border border-border shadow-sm">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Как создать связь:
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Выберите первого родственника на древе</li>
                        <li>Нажмите на кнопку &ldquo;Добавить связь&rdquo;</li>
                        <li>Выберите второго родственника</li>
                        <li>Укажите тип отношений</li>
                        <li>Подтвердите создание связи</li>
                      </ol>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="3">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-azure/20">
                      <Edit className="w-5 h-5 text-azure" />
                    </div>
                    <span className="font-medium text-foreground">Шаг 3: Редактирование информации</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Вы можете в любой момент изменить информацию о родственнике или связях.
                    </p>
                    <div className="p-4 rounded-xl bg-muted border border-border shadow-sm">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Что можно редактировать:
                      </h4>
                      <ul className="list-disc list-inside space-y-2 text-sm">
                        <li>Личные данные (имя, фамилия, отчество)</li>
                        <li>Даты рождения и смерти</li>
                        <li>Контактную информацию</li>
                        <li>Фотографию профиля</li>
                        <li>Семейные истории (в поле &ldquo;Контекст&rdquo;)</li>
                        <li>Типы связей между родственниками</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-azure/20">
                      <BookOpen className="w-5 h-5 text-azure" />
                    </div>
                    <span className="font-medium text-foreground">Шаг 4: Добавление семейных историй</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Семейные истории — это уникальные воспоминания и факты о ваших родственниках.
                    </p>
                    <div className="p-4 rounded-xl bg-muted border border-border shadow-sm">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Примеры историй:
                      </h4>
                      <ul className="list-disc list-inside space-y-2 text-sm">
                        <li>&ldquo;Как познакомились бабушка и дедушка&rdquo;</li>
                        <li>&ldquo;История переезда семьи в новый город&rdquo;</li>
                        <li>&ldquo;Семейные традиции и праздники&rdquo;</li>
                        <li>&ldquo;Профессиональные достижения&rdquo;</li>
                        <li>&ldquo;Интересные факты из жизни&rdquo;</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                      <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Совет:
                      </h4>
                      <p className="text-sm">
                        Используйте Telegram бота для сбора историй от родственников. Отправьте им ссылку, и они смогут добавить свои воспоминания напрямую!
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="5">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-azure/20">
                      <Search className="w-5 h-5 text-azure" />
                    </div>
                    <span className="font-medium text-foreground">Шаг 5: Навигация по древу</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Научитесь эффективно перемещаться по вашему семейному древу.
                    </p>
                    <div className="p-4 rounded-xl bg-muted border border-border shadow-sm">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Управление древом:
                      </h4>
                      <ul className="list-disc list-inside space-y-2 text-sm">
                        <li>Используйте колёсико мыши для масштабирования</li>
                        <li>Перетаскивайте древо, удерживая левую кнопку мыши</li>
                        <li>Кликните на карточку родственника для просмотра деталей</li>
                        <li>Используйте поиск для быстрого нахождения людей</li>
                        <li>Фильтруйте древо по поколениям или веткам</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="6" className="border-b-0">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-azure/20">
                      <Trash2 className="w-5 h-5 text-azure" />
                    </div>
                    <span className="font-medium text-foreground">Шаг 6: Удаление и восстановление</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Удаление родственников и связей работает через &ldquo;мягкое удаление&rdquo; — данные можно восстановить.
                    </p>
                    <div className="p-4 rounded-xl bg-muted border border-border shadow-sm">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Важно знать:
                      </h4>
                      <ul className="list-disc list-inside space-y-2 text-sm">
                        <li>Удалённые записи помечаются как неактивные</li>
                        <li>Связи с удалённым родственником также деактивируются</li>
                        <li>Вы можете восстановить удалённые данные</li>
                        <li>Для полного удаления обратитесь в поддержку</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start CTA */}
      <Card className="border-border bg-gradient-to-br from-charcoal-900 to-charcoal-800">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-2xl font-bold mb-2 text-foreground">
                Готовы начать?
              </h3>
              <p className="text-muted-foreground">
                Перейдите к созданию вашего семейного древа прямо сейчас
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => router.push('/tree')}
              className="shadow-glow-azure"
            >
              Создать древо
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
