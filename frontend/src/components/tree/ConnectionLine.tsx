'use client'

import { useMemo } from 'react'

// Relationship type labels in Russian (for displaying on lines)
const RELATIONSHIP_LABELS: Record<string, string> = {
  father: 'Отец',
  mother: 'Мать',
  son: 'Сын',
  daughter: 'Дочь',
  brother: 'Брат',
  sister: 'Сестра',
  grandfather: 'Дед',
  grandmother: 'Бабушка',
  grandson: 'Внук',
  granddaughter: 'Внучка',
  spouse: 'В браке',
  husband: 'В браке',  // Legacy: display as "В браке"
  wife: 'В браке',     // Legacy: display as "В браке"
  ex_spouse: 'Был(а) в браке',
  ex_husband: 'Был в браке',  // Legacy
  ex_wife: 'Была в браке',    // Legacy
  uncle: 'Дядя',
  aunt: 'Тётя',
  nephew: 'Племянник',
  niece: 'Племянница',
  cousin: 'Кузен',
  partner: 'Партнёр',
  stepfather: 'Отчим',
  stepmother: 'Мачеха',
  stepson: 'Пасынок',
  stepdaughter: 'Падчерица',
  half_brother: 'Сводный брат',
  half_sister: 'Сводная сестра',
  father_in_law: 'Тесть',
  mother_in_law: 'Тёща',
  son_in_law: 'Зять',
  daughter_in_law: 'Невестка',
  brother_in_law: 'Деверь',
  sister_in_law: 'Золовка',
  godfather: 'Крёстный',
  godmother: 'Крёстная',
  godson: 'Крестник',
  goddaughter: 'Крестница',
  guardian: 'Опекун',
  ward: 'Подопечный',
  parent: 'Родитель',
  child: 'Ребёнок',
  unknown: '?',
}

// Relationship types for dropdown selection (excludes deprecated types)
const RELATIONSHIP_OPTIONS: Record<string, string> = {
  father: 'Отец',
  mother: 'Мать',
  son: 'Сын',
  daughter: 'Дочь',
  brother: 'Брат',
  sister: 'Сестра',
  grandfather: 'Дед',
  grandmother: 'Бабушка',
  grandson: 'Внук',
  granddaughter: 'Внучка',
  spouse: 'В браке',
  ex_spouse: 'Был(а) в браке',
  uncle: 'Дядя',
  aunt: 'Тётя',
  nephew: 'Племянник',
  niece: 'Племянница',
  cousin: 'Кузен',
  partner: 'Партнёр',
  stepfather: 'Отчим',
  stepmother: 'Мачеха',
  stepson: 'Пасынок',
  stepdaughter: 'Падчерица',
  half_brother: 'Сводный брат',
  half_sister: 'Сводная сестра',
  father_in_law: 'Тесть',
  mother_in_law: 'Тёща',
  son_in_law: 'Зять',
  daughter_in_law: 'Невестка',
  brother_in_law: 'Деверь',
  sister_in_law: 'Золовка',
  godfather: 'Крёстный',
  godmother: 'Крёстная',
  godson: 'Крестник',
  goddaughter: 'Крестница',
  guardian: 'Опекун',
  ward: 'Подопечный',
  parent: 'Родитель',
  child: 'Ребёнок',
}

interface ConnectionLineProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  relationshipType: string
  fromCardHeight?: number
  toCardHeight?: number
}

export default function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  relationshipType,
  fromCardHeight = 208,
  toCardHeight = 208,
}: ConnectionLineProps) {
  const pathData = useMemo(() => {
    // Start from bottom center of "from" card
    const startX = fromX
    const startY = fromY + fromCardHeight / 2

    // End at top center of "to" card
    const endX = toX
    const endY = toY - toCardHeight / 2

    // Calculate control points for bezier curve
    const midY = (startY + endY) / 2

    // Create a smooth S-curve path
    const path = `M ${startX} ${startY}
                  C ${startX} ${midY},
                    ${endX} ${midY},
                    ${endX} ${endY}`

    return {
      path,
      labelX: (startX + endX) / 2,
      labelY: midY,
      startX,
      startY,
      endX,
      endY,
    }
  }, [fromX, fromY, toX, toY, fromCardHeight, toCardHeight])

  const label = RELATIONSHIP_LABELS[relationshipType] || relationshipType

  return (
    <g className="connection-line">
      {/* Main path */}
      <path
        d={pathData.path}
        fill="none"
        stroke="#ff6b35"
        strokeWidth="2"
        strokeLinecap="round"
        className="transition-all duration-300"
      />

      {/* Glow effect */}
      <path
        d={pathData.path}
        fill="none"
        stroke="#ff6b35"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.2"
      />

      {/* Arrow at the end */}
      <circle
        cx={pathData.endX}
        cy={pathData.endY}
        r="4"
        fill="#ff6b35"
      />

      {/* Label background */}
      <rect
        x={pathData.labelX - 30}
        y={pathData.labelY - 10}
        width="60"
        height="20"
        rx="4"
        fill="#1a1a1a"
        stroke="#ff6b35"
        strokeWidth="1"
      />

      {/* Label text */}
      <text
        x={pathData.labelX}
        y={pathData.labelY + 4}
        textAnchor="middle"
        fontSize="10"
        fill="#ff6b35"
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  )
}

export { RELATIONSHIP_LABELS, RELATIONSHIP_OPTIONS }
