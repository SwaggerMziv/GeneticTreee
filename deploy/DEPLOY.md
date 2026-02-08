# Деплой GeneticTree на 3 сервера

## Архитектура

```
Сервер 1: api.yourdomain.com   → Backend (FastAPI) + Nginx + SSL
Сервер 2: yourdomain.com       → Frontend (Next.js) + Nginx + SSL
Сервер 3: (без домена)         → Telegram Bot
```

Также необходима PostgreSQL база данных — можно поднять на сервере бэкенда или использовать managed DB.

---

## 0. Подготовка: сборка и публикация Docker-образов

Выполняется **на локальной машине** из корня проекта.

```bash
# Замени YOUR_DOCKERHUB_USERNAME на свой username
# Замени yourdomain.com на свой домен

# Логин в Docker Hub
docker login

# Backend
docker build -t YOUR_DOCKERHUB_USERNAME/genetic-tree-backend:latest ./backend
docker push YOUR_DOCKERHUB_USERNAME/genetic-tree-backend:latest

# Frontend (API URL вкомпилируется в образ на этапе сборки)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api \
  --build-arg NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username \
  -t YOUR_DOCKERHUB_USERNAME/genetic-tree-frontend:latest ./frontend
docker push YOUR_DOCKERHUB_USERNAME/genetic-tree-frontend:latest

# Telegram Bot
docker build -t YOUR_DOCKERHUB_USERNAME/genetic-tree-bot:latest ./telegram_bot
docker push YOUR_DOCKERHUB_USERNAME/genetic-tree-bot:latest
```

---

## 1. Сервер Backend (api.yourdomain.com)

### 1.1 Подготовка сервера

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Файрвол
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 1.2 DNS

Создай A-запись: `api.yourdomain.com` → IP сервера бэкенда

### 1.3 Развёртывание

```bash
mkdir -p /opt/genetic-tree && cd /opt/genetic-tree
```

Создай `docker-compose.yml` (скопируй из `deploy/backend/docker-compose.yml`), заменив `YOUR_DOCKERHUB_USERNAME`.

Создай `.env`:

```bash
nano .env
```

```env
ALLOW_ORIGINS=https://yourdomain.com
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=STRONG_PASSWORD_HERE
DATABASE_NAME=genetic_tree
JWT_SECRET_KEY=RANDOM_SECRET_HERE
BUCKET_NAME=your_bucket
ACCESS_KEY_ID=your_key
SECRET_ACCESS_KEY=your_secret
ENDPOINT_URL=https://s3.your-provider.com
REGION_NAME=us-east-1
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot
OPENAI_API_KEY=sk-your_key
```

### 1.4 Получение SSL-сертификата

```bash
# Копируем init-конфиг nginx (без SSL, чтобы certbot мог пройти проверку)
# Скопируй содержимое deploy/backend/nginx.init.conf в nginx.conf
# Замени api.yourdomain.com на свой домен
nano nginx.conf

# Создаём директории
mkdir -p certbot/conf certbot/www

# Запускаем
docker compose up -d

# Ждём пока backend стартует
sleep 30

# Получаем сертификат
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email YOUR_EMAIL@example.com --agree-tos --no-eff-email \
  -d api.yourdomain.com
```

### 1.5 Переключение на SSL

```bash
# Заменяем nginx.conf на SSL-версию
# Скопируй содержимое deploy/backend/nginx.conf
# Замени все api.yourdomain.com на свой домен
nano nginx.conf

# Перезапускаем nginx
docker compose restart nginx
```

### 1.6 Проверка

```bash
curl https://api.yourdomain.com/docs
```

---

## 2. Сервер Frontend (yourdomain.com)

### 2.1 Подготовка сервера

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
systemctl enable docker

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 2.2 DNS

Создай A-запись: `yourdomain.com` → IP сервера фронтенда

### 2.3 Развёртывание

```bash
mkdir -p /opt/genetic-tree && cd /opt/genetic-tree
```

Создай `docker-compose.yml` (из `deploy/frontend/docker-compose.yml`), заменив `YOUR_DOCKERHUB_USERNAME`.

### 2.4 Получение SSL-сертификата

```bash
# Копируем init-конфиг nginx
# Скопируй содержимое deploy/frontend/nginx.init.conf в nginx.conf
# Замени yourdomain.com на свой домен
nano nginx.conf

mkdir -p certbot/conf certbot/www
docker compose up -d
sleep 30

docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email YOUR_EMAIL@example.com --agree-tos --no-eff-email \
  -d yourdomain.com
```

### 2.5 Переключение на SSL

```bash
# Заменяем nginx.conf на SSL-версию
# Скопируй содержимое deploy/frontend/nginx.conf
# Замени все yourdomain.com на свой домен
nano nginx.conf

docker compose restart nginx
```

### 2.6 Проверка

```bash
curl -I https://yourdomain.com
```

---

## 3. Сервер Telegram Bot

### 3.1 Подготовка сервера

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
systemctl enable docker

ufw allow 22/tcp
ufw --force enable
```

> Боту не нужны порты 80/443 — он работает через long-polling с Telegram API.

### 3.2 Развёртывание

```bash
mkdir -p /opt/genetic-tree && cd /opt/genetic-tree
```

Создай `docker-compose.yml` (из `deploy/telegram_bot/docker-compose.yml`), заменив `YOUR_DOCKERHUB_USERNAME`.

Создай `.env`:

```bash
nano .env
```

```env
TELEGRAM_BOT_TOKEN=your_bot_token
BACKEND_URL=https://api.yourdomain.com
OPENAI_API_KEY=sk-your_key
BROADCAST_ENABLED=true
```

```bash
mkdir -p data
docker compose up -d
```

### 3.3 Проверка

```bash
docker compose logs -f
```

---

## 4. База данных PostgreSQL

### Вариант A: На сервере бэкенда

Добавь в `docker-compose.yml` бэкенда:

```yaml
  postgres:
    image: postgres:16-alpine
    container_name: genetic_tree_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: STRONG_PASSWORD_HERE
      POSTGRES_DB: genetic_tree
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - app_network

volumes:
  pgdata:
```

В `.env` бэкенда укажи `DATABASE_HOST=postgres`.

### Вариант B: Managed DB

Используй managed PostgreSQL от провайдера (Timeweb, Selectel, Yandex Cloud и т.д.).
В `.env` бэкенда укажи хост, порт, логин и пароль от managed DB.

### Инициализация таблиц

```bash
# На сервере бэкенда
docker compose exec backend python -m src.database.client
```

---

## 5. Обновление

На **локальной машине** пересобираешь и пушишь образы:

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/genetic-tree-backend:latest ./backend
docker push YOUR_DOCKERHUB_USERNAME/genetic-tree-backend:latest
```

На **сервере**:

```bash
cd /opt/genetic-tree
docker compose pull
docker compose up -d
```

---

## 6. Полезные команды

```bash
# Логи
docker compose logs -f
docker compose logs -f backend
docker compose logs -f nginx

# Перезапуск
docker compose restart

# Остановка
docker compose down

# Проверка статуса
docker compose ps

# Обновление + перезапуск
docker compose pull && docker compose up -d

# Очистка старых образов
docker image prune -f
```

---

## 7. Автообновление SSL-сертификатов

Certbot в контейнере автоматически обновляет сертификаты каждые 12 часов.
Для применения обновлённых сертификатов добавь cron-задачу на серверах backend и frontend:

```bash
crontab -e
```

```
0 3 * * 1 cd /opt/genetic-tree && docker compose restart nginx
```

Это перезапускает nginx каждый понедельник в 3:00, чтобы подхватить новые сертификаты.

---

## Структура файлов на каждом сервере

### Backend сервер
```
/opt/genetic-tree/
├── docker-compose.yml
├── nginx.conf
├── .env
└── certbot/
    ├── conf/     (сертификаты Let's Encrypt)
    └── www/      (ACME challenge)
```

### Frontend сервер
```
/opt/genetic-tree/
├── docker-compose.yml
├── nginx.conf
├── certbot/
    ├── conf/
    └── www/
```

### Telegram Bot сервер
```
/opt/genetic-tree/
├── docker-compose.yml
├── .env
└── data/        (данные бота)
```
