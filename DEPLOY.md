# Деплой GeneticTree на Timeweb Cloud

## Инфраструктура

| Сервис | Сервер | Ресурсы | Домен |
|--------|--------|---------|-------|
| Frontend | **client** | 2 CPU, 2 GB RAM, 40 GB NVMe | genetictree.ru |
| Backend | **server** | 3 CPU, 3 GB RAM, 15 GB NVMe | api.genetictree.ru |
| Telegram Bot | **bot** | 1 CPU, 1 GB RAM, 15 GB NVMe | — |
| PostgreSQL | **genetic_tree** | 1 CPU, 2 GB RAM, 20 GB NVMe | (внутренний IP) |
| S3 | Timeweb S3 | 0+ GB | s3.twcstorage.ru |
| Домен | genetictree.ru | — | оплачен до 17.12.2026 |

### DNS записи (настроить в Timeweb → Домены и SSL)

| Тип | Имя | Значение |
|-----|-----|----------|
| A | genetictree.ru | IP сервера **client** |
| A | api.genetictree.ru | IP сервера **server** |

---

## Подготовка (на каждом сервере)

```bash
# Установка Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Клонируем репо
cd /opt
git clone https://github.com/SwaggerMziv/GeneticTree.git genetic-tree
```

---

## 1. PostgreSQL (managed БД Timeweb)

БД уже создана в Timeweb. Нужно только:

1. Зайти в Timeweb → Базы данных → genetic_tree
2. Записать **хост**, **порт**, **логин**, **пароль**
3. Убедиться, что доступ открыт с IP серверов **server** и **bot**

### Инициализация таблиц

Таблицы создаются автоматически при первом запуске Backend (SQLAlchemy `create_all` + seed subscription plans в lifespan).

---

## 2. S3 хранилище (Timeweb S3)

1. Зайти в Timeweb → Хранилище S3
2. Записать: **bucket name**, **access key**, **secret key**, **endpoint URL** (обычно `https://s3.twcstorage.ru`), **region**
3. Bucket должен быть с публичным доступом на чтение (для отображения фото/медиа)

---

## 3. Backend (сервер `server`)

```bash
ssh root@<IP_СЕРВЕРА_SERVER>
cd /opt/genetic-tree/backend

# Создаём .env
cp .env.example .env
nano .env
```

### Заполнить .env:

```env
# CORS — URL фронтенда
ALLOW_ORIGINS=https://genetictree.ru

# База данных (из Timeweb → БД → genetic_tree)
DATABASE_HOST=<IP_или_хост_БД>
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<пароль_БД>
DATABASE_NAME=genetic_tree

# JWT — сгенерировать: openssl rand -hex 32
JWT_SECRET_KEY=<сгенерированный_ключ>

# S3 (из Timeweb → Хранилище S3)
BUCKET_NAME=<имя_бакета>
ACCESS_KEY_ID=<access_key>
SECRET_ACCESS_KEY=<secret_key>
ENDPOINT_URL=https://s3.twcstorage.ru
REGION_NAME=ru-1

# Telegram
TELEGRAM_BOT_TOKEN=<токен_от_BotFather>
TELEGRAM_BOT_USERNAME=genetic_tree_bot

# OpenRouter (AI)
OPENROUTER_API_KEY=sk-or-v1-<ваш_ключ>

# ЮKassa (платежи) — можно оставить пустыми если не нужны
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_WEBHOOK_SECRET=
```

### Первый запуск (получение SSL):

```bash
# Создаём директории для certbot
mkdir -p certbot/conf certbot/www

# Сохраняем рабочий nginx.conf и ставим временный HTTP-only
cp nginx.conf nginx.conf.ssl
cp nginx.init.conf nginx.conf

# Запускаем
docker compose up -d --build

# Ждём пока backend поднимется (~30-60 сек)
sleep 30

# Проверяем что работает
curl http://localhost/docs

# Получаем SSL сертификат
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com --agree-tos --no-eff-email \
  -d api.genetictree.ru

# Возвращаем SSL nginx конфиг
cp nginx.conf.ssl nginx.conf

# Перезапускаем с SSL
docker compose down && docker compose up -d
```

### Проверка:

```bash
curl -k https://api.genetictree.ru/docs
# Должен вернуть HTML страницу Swagger
```

Или открыть в браузере: https://api.genetictree.ru/docs

---

## 4. Frontend (сервер `client`)

```bash
ssh root@<IP_СЕРВЕРА_CLIENT>
cd /opt/genetic-tree/frontend

# Создаём .env (используется при сборке Docker-образа)
cp .env.example .env
nano .env
```

### Заполнить .env:

```env
# Backend API URL (БЕЗ /api в конце!)
NEXT_PUBLIC_API_URL=https://api.genetictree.ru

# Username Telegram-бота
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=genetic_tree_bot
```

### Первый запуск (получение SSL):

```bash
# Создаём директории для certbot
mkdir -p certbot/conf certbot/www

# Временный HTTP-only nginx
cp nginx.conf nginx.conf.ssl
cp nginx.init.conf nginx.conf

# Собираем и запускаем (сборка Next.js ~3-5 мин)
docker compose up -d --build

# Ждём пока соберётся
sleep 60

# Проверяем
curl http://localhost

# SSL сертификат
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com --agree-tos --no-eff-email \
  -d genetictree.ru

# Возвращаем SSL nginx конфиг
cp nginx.conf.ssl nginx.conf

# Перезапускаем
docker compose down && docker compose up -d
```

### Проверка:

Открыть в браузере: https://genetictree.ru

---

## 5. Telegram Bot (сервер `bot`)

```bash
ssh root@<IP_СЕРВЕРА_BOT>
cd /opt/genetic-tree/telegram_bot

# Создаём .env
cp .env.example .env
nano .env
```

### Заполнить .env:

```env
# Telegram
TELEGRAM_BOT_TOKEN=<тот_же_токен_что_в_backend>

# Backend API
BACKEND_URL=https://api.genetictree.ru

# AI
OPENROUTER_API_KEY=sk-or-v1-<ваш_ключ>

# Whisper (распознавание голоса)
# small — оптимально для 1 GB RAM, скачает ~461 MB при сборке
# tiny — если RAM мало (~39 MB модель)
WHISPER_MODEL_SIZE=tiny

# Рассылка напоминаний каждые 12 часов
BROADCAST_ENABLED=true

# Mini App
WEBAPP_URL=https://genetictree.ru
WEBAPP_PORT=8080
WEBAPP_JWT_SECRET=<openssl rand -hex 32>
```

> **Важно:** На сервере bot (1 GB RAM) используйте `WHISPER_MODEL_SIZE=tiny`. Модель `small` (~2 GB RAM) не поместится.

### Запуск:

```bash
# Сборка (скачает Whisper модель, соберёт Mini App — ~5-10 мин)
docker compose up -d --build

# Проверяем логи
docker compose logs -f
```

### Проверка:

Написать боту в Telegram `/start` — должно прийти приветственное сообщение.

---

## Обновление (деплой новой версии)

### На любом сервере:

```bash
cd /opt/genetic-tree

# Забираем изменения
git pull origin main

# Переходим в нужную директорию
cd backend    # или frontend, telegram_bot

# Пересборка
docker compose up -d --build
```

### Откат если всё сломалось:

```bash
# Смотрим предыдущий коммит
git log --oneline -5

# Откатываемся
git checkout <commit_hash>

# Пересобираем
docker compose up -d --build
```

---

## Полезные команды

```bash
# Логи в реальном времени
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f frontend

# Перезапуск без пересборки
docker compose restart

# Полная остановка
docker compose down

# Очистка Docker (если заканчивается место)
docker system prune -af --volumes
```

---

## SSL обновление

Certbot контейнер автоматически обновляет сертификаты каждые 12 часов. Для ручного обновления:

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

---

## Бэкап БД

```bash
# На сервере с доступом к БД
pg_dump -h <DB_HOST> -U postgres genetic_tree > backup_$(date +%Y%m%d).sql

# Восстановление
psql -h <DB_HOST> -U postgres genetic_tree < backup_20260316.sql
```

---

## Мониторинг

### Проверка что всё работает:

```bash
# Backend
curl -s https://api.genetictree.ru/docs | head -5

# Frontend
curl -s https://genetictree.ru | head -5

# Bot (на сервере bot)
docker compose ps
docker compose logs --tail=20
```

### Если что-то не работает:

1. **502 Bad Gateway** → контейнер приложения упал: `docker compose logs -f`
2. **SSL ошибка** → сертификат не получен: проверить DNS A-запись и перезапустить certbot
3. **CORS ошибка** → проверить `ALLOW_ORIGINS` в backend .env
4. **Bot не отвечает** → проверить токен и логи: `docker compose logs -f`
5. **Нет фото** → проверить S3 настройки и доступ к bucket

---

## Структура доменов

| Сервис | Домен | Порты |
|--------|-------|-------|
| Frontend | genetictree.ru | 80, 443 |
| Backend | api.genetictree.ru | 80, 443 |
| Bot Mini App | — (внутри бота) | 8080 (internal) |
| PostgreSQL | (внутренний IP Timeweb) | 5432 |
| S3 | s3.twcstorage.ru | 443 |
