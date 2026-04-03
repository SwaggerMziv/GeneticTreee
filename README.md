# GeneticTree

Веб-приложение для сбора и хранения семейных историй. Пользователь создаёт семейное древо, приглашает родственников через Telegram-бота, а бот проводит интервью и собирает воспоминания в красивые истории.

## Архитектура

```
Frontend (Next.js) ──► Backend API (FastAPI) ──► PostgreSQL
                              │                      │
                              ├──► S3 (медиа)        │
                              ├──► OpenRouter (AI)    │
                              └──► ЮKassa (платежи)   │
                                                      │
Telegram Bot (aiogram) ──► Backend API ───────────────┘
      │
      ├──► OpenRouter (интервью)
      └──► faster-whisper (распознавание голоса)
```

| Компонент | Стек | Директория |
|-----------|------|------------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy (async), asyncpg | `backend/` |
| **Frontend** | Next.js 14 (App Router), TypeScript, Ant Design, Tailwind CSS | `frontend/` |
| **Telegram Bot** | Python 3.11, aiogram 3, faster-whisper | `telegram_bot/` |

## Возможности

- **Семейное древо** — визуальный редактор на D3.js с drag & drop
- **AI-ассистент** — помогает заполнять профили родственников через чат
- **Telegram-бот** — проводит интервью с родственниками, записывает истории
- **Голосовые сообщения** — бот расшифровывает голосовые через локальную модель Whisper
- **Генерация книги** — PDF-книга семейных историй (ReportLab)
- **Подписки и платежи** — интеграция с ЮKassa
- **Админ-панель** — управление пользователями и статистика

## Быстрый старт

### Требования

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Backend

```bash
cd backend
python -m venv venv && venv\Scripts\activate  # Windows
# source venv/bin/activate                    # Linux/Mac
pip install -r requirements.txt

# Настроить переменные окружения
cp .env.example .env
# Заполнить .env

# Запуск (создаст таблицы автоматически)
uvicorn src.main:app --reload
```

API документация: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install

# Настроить переменные окружения
cp .env.example .env
# Заполнить .env

npm run dev
```

Приложение: http://localhost:3000

### Telegram Bot

```bash
cd telegram_bot
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt

# Настроить переменные окружения
cp .env.example .env
# Заполнить .env

python main.py
```

Подробная документация бота: [telegram_bot/README.md](telegram_bot/README.md)

## Переменные окружения

Каждый компонент имеет свой `.env.example` с описанием всех переменных:

- [`backend/.env.example`](backend/.env.example) — БД, JWT, S3, Telegram, OpenRouter, ЮKassa
- [`frontend/.env.example`](frontend/.env.example) — URL бэкенда, username бота
- [`telegram_bot/.env.example`](telegram_bot/.env.example) — токен бота, OpenRouter, Whisper

## Деплой

Проект контейнеризирован через Docker Compose. Каждый компонент имеет свой `Dockerfile` и `docker-compose.yml`.

Подробная инструкция по деплою: [DEPLOY.md](DEPLOY.md)

CI/CD настроен через GitHub Actions — автодеплой при пуше в `main`.

## Структура проекта

```
GeneticTree/
├── backend/
│   ├── src/
│   │   ├── ai/             # AI-ассистент (OpenRouter)
│   │   ├── auth/           # JWT авторизация
│   │   ├── book/           # Генерация PDF книги
│   │   ├── core/           # Middleware, CORS, логирование
│   │   ├── database/       # SQLAlchemy, модели, миграции
│   │   ├── family/         # Родственники, связи, истории
│   │   ├── storage/        # S3 интеграция
│   │   ├── subscription/   # Подписки и платежи
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js страницы
│   │   ├── components/     # React компоненты
│   │   └── lib/            # API клиент, утилиты
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── telegram_bot/
│   ├── bot/                # Обработчики, состояния, планировщик
│   ├── services/           # API клиент, AI, хранилище
│   ├── webapp/             # Mini App (FastAPI + Next.js)
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── deploy/                 # Конфигурации для продакшена
├── .github/workflows/      # CI/CD
└── DEPLOY.md               # Инструкция по деплою
```

## API

Все эндпоинты доступны с префиксом `/api/v1/`:

| Модуль | Путь | Описание |
|--------|------|----------|
| Авторизация | `/auth` | Регистрация, логин, JWT токены |
| Пользователи | `/users` | CRUD пользователей |
| Родственники | `/family/{user_id}/relatives` | Управление родственниками |
| Связи | `/family/{user_id}/relationships` | Родственные связи |
| Древо | `/family/{user_id}/family-tree` | Граф связей для визуализации |
| Статистика | `/family/{user_id}/statistics` | Статистика древа |
| AI-ассистент | `/ai` | Чат с AI (function calling) |
| Книга | `/book` | Генерация PDF (SSE) |
| Хранилище | `/storage` | Загрузка файлов в S3 |
| Подписки | `/subscriptions` | Тарифы и платежи |

Интерактивная документация: `{API_URL}/docs` (Swagger UI)

## Лицензия

Все права защищены.
