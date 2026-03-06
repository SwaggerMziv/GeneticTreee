# Telegram-бот семейного архива

Бот для сбора семейных историй через интервью. Родственники получают ссылку-приглашение, подключаются к боту и отвечают на вопросы — бот сам генерирует из ответов красивые истории и сохраняет их в семейное древо.

## Что умеет бот

- **Проводит интервью** — задаёт вопросы о жизни, детстве, семье, работе
- **Расшифровывает голосовые** — можно просто наговорить историю, бот сам переведёт в текст (локальная модель faster-whisper, без внешних API)
- **Создаёт истории** — из диалога автоматически формируется связный рассказ от первого лица
- **Напоминает о себе** — раз в 12 часов присылает интересный вопрос, чтобы родственник не забывал делиться воспоминаниями
- **Использует семейный контекст** — при генерации вопросов учитывает истории других родственников

---

## Система приглашений и привязки к базе данных

Это ключевой функционал, связывающий веб-приложение, телеграм-бота и базу данных PostgreSQL.

### Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│  1. ВЛАДЕЛЕЦ ДРЕВА (Frontend)                                   │
│     - Создаёт родственника на сайте                             │
│     - Нажимает "Пригласить в Telegram"                          │
│     - Получает уникальную ссылку                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. BACKEND API                                                 │
│     - Генерирует криптографический токен (secrets.token_urlsafe)│
│     - Сохраняет токен в БД: relative.invitation_token           │
│     - Формирует ссылку: https://t.me/bot?start={token}          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. РОДСТВЕННИК                                                 │
│     - Получает ссылку (email, WhatsApp, SMS)                    │
│     - Кликает по ссылке                                         │
│     - Telegram открывает бота с параметром start={token}        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. TELEGRAM BOT                                                │
│     - Получает /start {token}                                   │
│     - Отправляет токен + telegram_user_id на бэкенд             │
│     - Бэкенд валидирует токен и активирует родственника         │
│     - Бот сохраняет данные локально для рассылок                │
└─────────────────────────────────────────────────────────────────┘
```

### Детали реализации

#### 1. Генерация токена (Backend)

**Эндпоинт:** `POST /api/v1/family/{user_id}/relatives/{relative_id}/generate-invitation`

**Требует:** JWT-авторизацию владельца древа

**Что происходит:**
1. Проверяется, что родственник принадлежит пользователю
2. Проверяется, что родственник ещё не активирован
3. Генерируется уникальный токен через `secrets.token_urlsafe(32)`
4. Токен сохраняется в БД в поле `invitation_token`
5. Формируется и возвращается ссылка

**Код генерации токена (repository.py):**
```python
async def generate_invitation_token(self, relative_id: int, user_id: int) -> str:
    import secrets

    # Криптографически безопасный 32-байтовый токен (URL-safe Base64)
    token = secrets.token_urlsafe(32)

    stmt = update(FamilyRelationModel).where(
        FamilyRelationModel.id == relative_id,
        FamilyRelationModel.user_id == user_id
    ).values(invitation_token=token)

    await self.session.execute(stmt)
    return token
```

**Формат ответа:**
```json
{
    "invitation_url": "https://t.me/genetic_tree_bot?start=AbCdEfGhIjKlMnOp...",
    "token": "AbCdEfGhIjKlMnOp...",
    "relative_id": 42,
    "relative_name": "Мария Ивановна"
}
```

#### 2. Структура БД для приглашений

**Таблица:** `family_relations` (модель `FamilyRelationModel`)

| Поле | Тип | Описание |
|------|-----|----------|
| `invitation_token` | VARCHAR(64), UNIQUE, INDEX | Уникальный токен приглашения |
| `telegram_user_id` | BIGINT, INDEX | Telegram ID пользователя после активации |
| `telegram_id` | VARCHAR | Telegram username (@username) |
| `is_activated` | BOOLEAN | Флаг активации (по умолчанию false) |
| `activated_at` | TIMESTAMP WITH TZ | Время активации |

**Индексы:**
- `invitation_token` — для быстрого поиска по токену O(1)
- `telegram_user_id` — для поиска родственника по Telegram ID

#### 3. Обработка ссылки в боте (start.py)

Когда пользователь кликает ссылку `https://t.me/bot?start=TOKEN`, Telegram открывает бота и передаёт команду `/start TOKEN`.

**Код обработки:**
```python
@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    args = message.text.split(maxsplit=1)

    if len(args) > 1:
        # Есть токен — это переход по ссылке-приглашению
        token = args[1]

        try:
            # Активируем родственника через бэкенд
            relative_data = await backend_api.activate_user(
                token=token,
                telegram_user_id=message.from_user.id,
                username=message.from_user.username
            )

            # Сохраняем в FSM-состояние для интервью
            await state.update_data(
                relative_id=relative_data["id"],
                relative_name=f"{relative_data['first_name']} {relative_data['last_name']}"
            )

            # Сохраняем локально для рассылок
            user_storage.add_user(
                telegram_id=message.from_user.id,
                relative_id=relative_data["id"],
                name=relative_name,
                enabled_broadcast=True  # По умолчанию включаем рассылку
            )

            await message.answer("Добро пожаловать! ...")

        except httpx.HTTPStatusError as e:
            # Обработка ошибок (см. ниже)
            ...
    else:
        # Обычный /start без токена — проверяем локальное хранилище
        user_data = user_storage.get_user(message.from_user.id)
        if user_data:
            # Восстанавливаем сессию
            await state.update_data(
                relative_id=user_data["relative_id"],
                relative_name=user_data.get("name", "")
            )
```

#### 4. Активация на бэкенде

**Эндпоинт:** `POST /api/v1/family/activate-invitation`

**Не требует авторизации** — это публичный эндпоинт для бота

**Тело запроса:**
```json
{
    "token": "AbCdEfGhIjKlMnOp...",
    "telegram_user_id": 123456789,
    "telegram_username": "maria_ivanova"
}
```

**Логика валидации (service.py):**
```python
async def activate_invitation(self, token: str, telegram_user_id: int, telegram_username: str = None):
    # 1. Ищем родственника по токену
    relative = await self.repository.get_by_invitation_token(token)
    if not relative:
        raise InvalidInvitationTokenError()  # 404

    # 2. Проверяем, что ещё не активирован
    if relative.is_activated:
        raise RelativeAlreadyActivatedError(relative.id)  # 400

    # 3. Проверяем, что этот Telegram-аккаунт не привязан к другому родственнику
    existing = await self.repository.get_by_telegram_user_id(telegram_user_id)
    if existing and existing.id != relative.id:
        raise TelegramUserAlreadyLinkedError(telegram_user_id)  # 400

    # 4. Активируем
    return await self.repository.activate_relative(
        relative.id, telegram_user_id, telegram_username
    )
```

**Что происходит при активации (repository.py):**
```python
async def activate_relative(self, relative_id: int, telegram_user_id: int, telegram_username: str = None):
    update_data = {
        'telegram_user_id': telegram_user_id,
        'is_activated': True,
        'activated_at': datetime.now(timezone.utc)
    }

    if telegram_username:
        update_data['telegram_id'] = telegram_username

    stmt = update(FamilyRelationModel).where(
        FamilyRelationModel.id == relative_id
    ).values(**update_data).returning(FamilyRelationModel)

    result = await self.session.execute(stmt)
    return result.scalar_one()
```

#### 5. Обработка ошибок

| Ошибка | HTTP код | Когда возникает | Ответ бота |
|--------|----------|-----------------|------------|
| `InvalidInvitationTokenError` | 404 | Токен не найден или истёк | "Неверная или устаревшая ссылка. Попросите родственника отправить новую." |
| `RelativeAlreadyActivatedError` | 400 | Профиль уже активирован | "Этот профиль уже активирован! Используйте /interview" |
| `TelegramUserAlreadyLinkedError` | 400 | Telegram-аккаунт уже привязан к другому родственнику | "Этот Telegram-аккаунт уже привязан к другому профилю." |

**Код обработки в боте:**
```python
except httpx.HTTPStatusError as e:
    if e.response.status_code == 404:
        await message.answer(
            "Неверная или устаревшая ссылка-приглашение.\n"
            "Попросите родственника отправить вам новую ссылку."
        )
    elif e.response.status_code == 400:
        error_data = e.response.json()
        error_type = error_data.get("details", {}).get("error_type", "")

        if error_type == "telegram_user_already_linked":
            await message.answer(
                "Этот Telegram-аккаунт уже привязан к другому профилю.\n\n"
                "Один Telegram-аккаунт = один родственник в архиве."
            )
        else:  # already_activated
            await message.answer(
                "Этот профиль уже активирован!\n\n"
                "Используйте /interview для интервью."
            )
```

#### 6. Восстановление сессии

Если пользователь возвращается в бота без токена (просто открыл бота), бот проверяет локальное хранилище:

```python
else:
    # /start без токена
    user_data = user_storage.get_user(message.from_user.id)
    if user_data:
        # Пользователь уже был активирован ранее
        await state.update_data(
            relative_id=user_data["relative_id"],
            relative_name=user_data.get("name", "")
        )
        await message.answer("С возвращением! Продолжим?")
    else:
        # Новый пользователь без ссылки
        await message.answer(
            "Чтобы начать, перейдите по ссылке-приглашению от родственника."
        )
```

### Адаптация для других проектов (Redis)

Для интеграции с Redis вместо PostgreSQL нужно изменить только бэкенд:

**Генерация токена (Redis):**
```python
import secrets
import redis.asyncio as redis

async def generate_invitation_token(relative_id: int) -> str:
    token = secrets.token_urlsafe(32)

    # Сохраняем в Redis с TTL (например, 7 дней)
    await redis_client.setex(
        f"invitation:{token}",
        timedelta(days=7),
        json.dumps({"relative_id": relative_id})
    )

    return token
```

**Активация (Redis):**
```python
async def activate_invitation(token: str, telegram_user_id: int):
    # Получаем данные по токену
    data = await redis_client.get(f"invitation:{token}")
    if not data:
        raise InvalidInvitationTokenError()

    invitation = json.loads(data)
    relative_id = invitation["relative_id"]

    # Проверяем, не занят ли telegram_user_id
    existing = await redis_client.get(f"telegram:{telegram_user_id}")
    if existing:
        raise TelegramUserAlreadyLinkedError()

    # Связываем telegram_user_id с relative_id
    await redis_client.set(
        f"telegram:{telegram_user_id}",
        json.dumps({"relative_id": relative_id, "activated_at": datetime.now().isoformat()})
    )

    # Удаляем использованный токен
    await redis_client.delete(f"invitation:{token}")

    return {"relative_id": relative_id}
```

**Структура ключей в Redis:**
```
invitation:{token}     → {"relative_id": 42}              # TTL: 7 дней
telegram:{user_id}     → {"relative_id": 42, ...}         # Без TTL
relative:{relative_id} → {"telegram_user_id": 123456789}  # Без TTL
```

### Диаграмма данных

```
┌────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (Backend)                        │
├────────────────────────────────────────────────────────────────┤
│  family_relations                                               │
│  ┌────────────────┬────────────────┬─────────────────────────┐ │
│  │ id             │ invitation_token│ telegram_user_id        │ │
│  ├────────────────┼────────────────┼─────────────────────────┤ │
│  │ 42             │ AbCdEf...      │ NULL (до активации)     │ │
│  │ 42             │ AbCdEf...      │ 123456789 (после)       │ │
│  └────────────────┴────────────────┴─────────────────────────┘ │
│                                                                  │
│  + is_activated: false → true                                   │
│  + activated_at: NULL → 2024-01-15T10:30:00Z                   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                  Local Storage (Bot)                            │
├────────────────────────────────────────────────────────────────┤
│  data/users.json                                                │
│  {                                                              │
│    "users": {                                                   │
│      "123456789": {           ← telegram_user_id                │
│        "relative_id": 42,     ← связь с БД                      │
│        "name": "Мария",                                         │
│        "enabled_broadcast": true                                │
│      }                                                          │
│    }                                                            │
│  }                                                              │
└────────────────────────────────────────────────────────────────┘
```

---

## Быстрый старт

### 1. Установка зависимостей

```bash
cd telegram_bot
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Настройка окружения

Создай файл `.env` в папке `telegram_bot`:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
BACKEND_URL=http://localhost:8000
OPENROUTER_API_KEY=sk-or-v1-...

# Whisper (локальная модель, размеры: tiny, base, small, medium, large-v3)
WHISPER_MODEL_SIZE=small

# Опционально
BROADCAST_ENABLED=true
```

**Где взять токены:**
- `TELEGRAM_BOT_TOKEN` — создай бота через [@BotFather](https://t.me/BotFather), он выдаст токен
- `OPENROUTER_API_KEY` — в личном кабинете [OpenRouter](https://openrouter.ai/keys)

### 3. Запуск

```bash
python main.py
```

Если всё ок, увидишь в консоли:
```
INFO - Starting Family Archive Bot...
INFO - No webhook set
INFO - Broadcast scheduler started (interval: 12h)
INFO - Starting polling...
```

---

## Как это работает

### Для пользователя (родственника)

1. Владелец древа создаёт на сайте родственника и генерирует ссылку-приглашение
2. Родственник переходит по ссылке — попадает в бота
3. Бот активирует аккаунт и предлагает начать интервью
4. Родственник отвечает на вопросы (текстом или голосом)
5. После каждых 3 ответов бот предлагает создать историю
6. Раз в 12 часов бот присылает напоминание с новым вопросом

### Техническая часть

```
Пользователь ─────► Telegram API ─────► Бот (aiogram)
                                            │
                                            ├──► OpenRouter (GPT-4o для интервью)
                                            ├──► faster-whisper (локальное распознавание голоса)
                                            │
                                            └──► Backend API (сохранение историй)
                                                      │
                                                      ▼
                                                 PostgreSQL
```

---

## Структура проекта

```
telegram_bot/
├── main.py              # Точка входа, запуск бота
├── config.py            # Все настройки в одном месте
├── requirements.txt     # Зависимости
│
├── bot/                 # Всё что связано с ботом
│   ├── instance.py      # Объекты Bot и Dispatcher
│   ├── handlers/        # Обработчики команд и сообщений
│   │   ├── start.py     # /start и активация по ссылке
│   │   ├── commands.py  # /help, /stats, /stop
│   │   ├── interview.py # Логика интервью
│   │   ├── settings.py  # Настройки рассылки
│   │   └── utils.py     # Вспомогательные функции
│   ├── keyboards/       # Клавиатуры
│   │   └── menus.py
│   ├── states/          # FSM-состояния
│   │   └── interview.py
│   └── scheduler/       # Планировщик задач
│       └── broadcast.py # Рассылка напоминаний
│
├── services/            # Внешние сервисы
│   ├── api.py           # Клиент для бэкенда
│   ├── ai.py            # Работа с OpenAI
│   └── storage.py       # Локальное хранилище пользователей
│
└── data/                # Данные (не коммитятся)
    └── users.json       # Информация о пользователях для рассылки
```

---

## Команды бота

| Команда | Что делает |
|---------|------------|
| `/start` | Приветствие + активация по ссылке |
| `/start {token}` | Активация по ссылке-приглашению |
| `/interview` | Начать или продолжить интервью |
| `/stats` | Сколько историй записано |
| `/settings` | Настройки рассылки |
| `/help` | Справка |
| `/stop` | Остановить интервью |

---

## Интервью

### Как устроено

1. Пользователь нажимает "Начать интервью"
2. Бот загружает контекст семьи (истории других родственников)
3. Бот задаёт первый вопрос (через OpenAI GPT-4o)
4. Пользователь отвечает текстом или голосом
5. Бот анализирует ответ и задаёт уточняющий вопрос
6. После 3+ ответов появляется кнопка "Создать историю"
7. Бот генерирует связный рассказ от первого лица
8. Пользователь подтверждает или редактирует

### FSM-состояния

```python
class InterviewStates(StatesGroup):
    waiting_answer = State()      # Ждём ответа на вопрос
    confirming_story = State()    # Подтверждение сохранения истории
```

### Промпт для интервью

Бот ведёт себя как профессиональный интервьюер — не хвалит, не восхищается, задаёт короткие конкретные вопросы:

```
✓ "Понял. А родители знали, что вы туда поехали?"
✓ "Как потом сложились отношения с Артёмом?"

✗ "Это звучит как настоящее приключение! Невероятно!"
```

Бот отслеживает, какие темы уже обсуждались, и не возвращается к ним.

### Голосовые сообщения

Бот принимает голосовые и расшифровывает их локально через faster-whisper (без обращения к внешним API):

```
🎧 Расшифровываю голосовое сообщение...

📝 *Расшифровка:*
_Ну вот, значит, было мне тогда лет восемь..._
```

После расшифровки текст обрабатывается как обычный ответ.

### Создание историй

Из диалога бот формирует связную историю от первого лица:

```
📖 *Летний лагерь на озере*

Мне было восемь лет, когда родители впервые отправили меня в летний
лагерь. Помню, как сильно боялся ехать один...
```

**Валидация контента:** Бот проверяет, что в диалоге достаточно конкретных деталей (имена, даты, места). Если ответы слишком короткие или абстрактные — предлагает продолжить интервью.

---

## Рассылка напоминаний

Каждые 12 часов бот проверяет, кому пора отправить напоминание. Это не спам — просто тёплое сообщение с вопросом типа:

> Здравствуйте, Мария!
>
> У меня есть для вас вопрос:
>
> *Какое самое яркое воспоминание из детства приходит вам на ум прямо сейчас?*
>
> Нажмите кнопку ниже, чтобы поделиться историей!

Пользователь может отключить рассылку в настройках (`/settings`) или прямо из сообщения.

### Список вопросов для рассылки

Бот циклически отправляет вопросы из списка (20 штук):

- Какое самое яркое воспоминание из детства?
- Кто был вашим лучшим другом в школе?
- Расскажите о своём первом рабочем дне
- Какой совет от родителей вы помните до сих пор?
- Опишите самый запоминающийся праздник в семье
- История из жизни бабушки или дедушки
- Момент, который изменил вашу жизнь
- Ваше самое большое достижение
- Любимое семейное путешествие
- Традиция, которую хотите передать детям
- Как познакомились со второй половинкой
- Какой урок жизни усвоили на опыте
- Человек, который сильно повлиял на жизнь
- Блюдо, которое готовила мама/бабушка
- Дом, в котором выросли
- Музыка или песня из молодости
- Первый домашний питомец
- Самый смешной случай в жизни
- Что бы сказали себе молодому
- Какие качества унаследовали от родителей

Вопросы не повторяются подряд — для каждого пользователя запоминается, какой вопрос был последним.

### Обработка заблокировавших бота

Если пользователь заблокировал бота, рассылка автоматически отключается:

```python
if "blocked" in error_str.lower() or "deactivated" in error_str.lower():
    user_storage.set_broadcast_enabled(user["telegram_id"], False)
```

### Настройка рассылки

В `.env` можно полностью отключить рассылку:

```env
BROADCAST_ENABLED=false
```

Интервал (12 часов) задаётся в `config.py`:

```python
BROADCAST_INTERVAL_HOURS: int = 12
```

---

## API бэкенда

Бот использует следующие эндпоинты:

| Метод | Эндпоинт | Что делает |
|-------|----------|------------|
| POST | `/api/v1/family/activate-invitation` | Активация по токену (публичный) |
| GET | `/api/v1/family/relative-by-telegram/{id}` | Получить данные родственника |
| POST | `/api/v1/family/relatives/{id}/story` | Сохранить историю |
| GET | `/api/v1/family/relatives/{id}/stories-count` | Количество историй |
| GET | `/api/v1/family/relatives/active-telegram` | Все активные пользователи |
| GET | `/api/v1/family/relatives/{id}/related-stories` | Истории родственников для контекста |

### Детали эндпоинта активации

**POST /api/v1/family/activate-invitation**

Публичный эндпоинт (без JWT), вызывается ботом.

Request:
```json
{
    "token": "AbCdEfGhIjKlMnOp...",
    "telegram_user_id": 123456789,
    "telegram_username": "maria_ivanova"
}
```

Response (200):
```json
{
    "id": 42,
    "first_name": "Мария",
    "last_name": "Ивановна",
    "is_activated": true,
    "telegram_user_id": 123456789,
    "activated_at": "2024-01-15T10:30:00Z"
}
```

Errors:
- 404: `{"detail": "Invalid or expired invitation token"}`
- 400: `{"detail": "...", "details": {"error_type": "already_activated"}}`
- 400: `{"detail": "...", "details": {"error_type": "telegram_user_already_linked"}}`

---

## Хранилище пользователей

Для рассылки бот хранит данные локально в `data/users.json`:

```json
{
  "users": {
    "123456789": {
      "relative_id": 42,
      "name": "Мария Ивановна",
      "enabled_broadcast": true,
      "last_interaction": "2024-01-15T10:30:00",
      "added_at": "2024-01-10T14:20:00",
      "broadcast_count": 5,
      "last_question_index": 7
    }
  },
  "broadcast_history": [],
  "last_broadcast": "2024-01-15T08:00:00"
}
```

Это нужно, чтобы:
- Знать, кому отправлять напоминания
- Не повторять один и тот же вопрос
- Отслеживать, кто отключил рассылку
- Восстанавливать сессию при перезапуске бота

---

## Разработка

### Добавить новый обработчик

1. Создай файл в `bot/handlers/`
2. Определи роутер:

```python
from aiogram import Router, F
from aiogram.types import Message

router = Router()

@router.message(F.text == "🆕 Моя команда")
async def my_handler(message: Message):
    await message.answer("Привет!")
```

3. Подключи в `bot/handlers/__init__.py`:

```python
from bot.handlers.my_handler import router as my_router

def setup_routers() -> Router:
    main_router = Router()
    main_router.include_router(my_router)  # Добавь сюда
    # ...
    return main_router
```

### Добавить новую клавиатуру

В `bot/keyboards/menus.py`:

```python
def get_my_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Кнопка 1")],
            [KeyboardButton(text="Кнопка 2")],
        ],
        resize_keyboard=True,
    )
```

### Добавить вопрос для рассылки

В `config.py` найди список `BROADCAST_QUESTIONS` и добавь свой:

```python
BROADCAST_QUESTIONS = [
    # ...существующие вопросы...
    "Ваш новый классный вопрос?",
]
```

---

## Возможные проблемы

### Бот не отвечает

1. Проверь токен в `.env`
2. Убедись, что бэкенд запущен и доступен
3. Посмотри логи — там будет ошибка

### "AI-ассистент временно недоступен"

Закончились деньги на OpenAI или превышен лимит запросов. Проверь баланс.

### Рассылка не работает

1. Убедись, что `BROADCAST_ENABLED=true`
2. Проверь, есть ли пользователи в `data/users.json`
3. Рассылка срабатывает раз в 12 часов — может, просто ещё не время

### Голосовые не расшифровываются

1. Проверь, установлен ли `ffmpeg` (нужен faster-whisper для декодирования аудио)
2. Проверь, что модель скачалась (первый запуск скачивает ~461 MB для модели `small`)
3. Проверь RAM — модель `small` требует ~2 GB

### "Неверная или устаревшая ссылка"

Токен не найден в БД. Возможные причины:
- Ссылка была сгенерирована для другого окружения (dev/prod)
- Родственник был удалён из древа
- Ошибка копирования ссылки

---

## Логи

Бот пишет логи в консоль. Уровень логирования можно поменять в `main.py`:

```python
logging.basicConfig(
    level=logging.DEBUG,  # Было INFO
    ...
)
```

---

## Зависимости

- **aiogram 3.x** — асинхронная работа с Telegram API
- **httpx** — HTTP-клиент для запросов к бэкенду
- **openai** — SDK для OpenRouter (GPT-4o)
- **faster-whisper** — локальное распознавание голоса (CTranslate2)
- **python-dotenv** — загрузка переменных окружения
