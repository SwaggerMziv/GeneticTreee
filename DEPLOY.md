# Деплой GeneticTree (3 сервера)

Архитектура:
- **Сервер 1**: Frontend (yourdomain.com)
- **Сервер 2**: Backend API (api.yourdomain.com)
- **Сервер 3**: Telegram Bot
- **Внешние**: PostgreSQL, S3

---

## Подготовка (на каждом сервере)

```bash
# Установка Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## 1. Backend (api.yourdomain.com)

```bash
# Клонируем и переходим в backend
git clone <repo> /opt/genetic-tree
cd /opt/genetic-tree/backend

# Настраиваем .env
cp .env.example .env
nano .env
```

**Заполнить в .env:**
- `DATABASE_HOST` - IP/домен сервера БД
- `DATABASE_PASSWORD` - пароль БД
- `JWT_SECRET_KEY` - сгенерировать: `openssl rand -hex 32`
- `ALLOW_ORIGINS` - https://yourdomain.com (URL фронта)
- S3 настройки
- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`

```bash
# Заменяем домен в nginx
sed -i 's/api.yourdomain.com/ТВОЙ_API_ДОМЕН/g' nginx.conf

# Получаем SSL
mkdir -p certbot/conf certbot/www
cp nginx.init.conf nginx.conf.bak
cp nginx.init.conf nginx.conf

docker-compose up -d --build
sleep 30

docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email ТВОЙ_EMAIL --agree-tos --no-eff-email \
  -d ТВОЙ_API_ДОМЕН

# Возвращаем SSL конфиг и перезапускаем
cp nginx.conf.bak nginx.conf
sed -i 's/api.yourdomain.com/ТВОЙ_API_ДОМЕН/g' nginx.conf
docker-compose down && docker-compose up -d
```

**Проверка:** https://api.yourdomain.com/docs

---

## 2. Frontend (yourdomain.com)

```bash
cd /opt/genetic-tree/frontend

# Настраиваем .env
cp .env.example .env
nano .env
```

**Заполнить в .env:**
- `NEXT_PUBLIC_API_URL` - https://api.yourdomain.com/api
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` - имя бота

```bash
# Заменяем домен в nginx
sed -i 's/yourdomain.com/ТВОЙ_ДОМЕН/g' nginx.conf

# Получаем SSL
mkdir -p certbot/conf certbot/www
cp nginx.init.conf nginx.conf.bak
cp nginx.init.conf nginx.conf

docker-compose up -d --build
sleep 30

docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email ТВОЙ_EMAIL --agree-tos --no-eff-email \
  -d ТВОЙ_ДОМЕН

# Возвращаем SSL конфиг и перезапускаем
cp nginx.conf.bak nginx.conf
sed -i 's/yourdomain.com/ТВОЙ_ДОМЕН/g' nginx.conf
docker-compose down && docker-compose up -d
```

**Проверка:** https://yourdomain.com

---

## 3. Telegram Bot

```bash
cd /opt/genetic-tree/telegram_bot

# Настраиваем .env
cp .env.example .env
nano .env
```

**Заполнить в .env:**
- `TELEGRAM_BOT_TOKEN` - токен от @BotFather
- `BACKEND_URL` - https://api.yourdomain.com
- `OPENAI_API_KEY`
- `BROADCAST_ENABLED` - true/false

```bash
# Запускаем
docker-compose up -d --build
```

**Проверка:** найти бота в Telegram, отправить /start

---

## Полезные команды

```bash
# Логи
docker-compose logs -f

# Перезапуск
docker-compose restart

# Пересборка
docker-compose up -d --build

# Остановка
docker-compose down
```

## Обновление SSL (автоматически)

Certbot контейнер автоматически обновляет сертификаты. Для ручного:

```bash
docker-compose run --rm certbot renew
docker-compose restart nginx
```

## Бэкап БД (на сервере БД)

```bash
pg_dump -U postgres genetic_tree > backup_$(date +%Y%m%d).sql
```

---

## Структура доменов

| Сервис | Домен | Порты |
|--------|-------|-------|
| Frontend | yourdomain.com | 80, 443 |
| Backend | api.yourdomain.com | 80, 443 |
| Bot | - | - |
| PostgreSQL | db.yourdomain.com | 5432 |
| S3 | s3.provider.com | 443 |
