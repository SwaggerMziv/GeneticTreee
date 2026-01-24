# Деплой через Docker Hub (без git clone)

## 1. Подготовка образов (на локальной машине)

```bash
# Замени YOUR_DOCKERHUB_USERNAME на свой username
# Замени api.yourdomain.com на свой домен API

# Логин в Docker Hub
docker login

# Собираем и пушим backend
docker build -t YOUR_DOCKERHUB_USERNAME/genetic-tree-backend:latest ./backend
docker push YOUR_DOCKERHUB_USERNAME/genetic-tree-backend:latest

# Собираем и пушим frontend (с URL API)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api \
  -t YOUR_DOCKERHUB_USERNAME/genetic-tree-frontend:latest ./frontend
docker push YOUR_DOCKERHUB_USERNAME/genetic-tree-frontend:latest

# Собираем и пушим бота
docker build -t YOUR_DOCKERHUB_USERNAME/genetic-tree-bot:latest ./telegram_bot
docker push YOUR_DOCKERHUB_USERNAME/genetic-tree-bot:latest
```

---

## 2. На сервере Backend (api.yourdomain.com)

```bash
# Создаём папку
mkdir -p /opt/genetic-tree && cd /opt/genetic-tree

# Скачиваем только нужные файлы (или копируем из deploy/backend/)
cat > docker-compose.yml << 'EOF'
services:
  backend:
    image: YOUR_DOCKERHUB_USERNAME/genetic-tree-backend:latest
    container_name: genetic_tree_backend
    restart: unless-stopped
    env_file:
      - .env
    networks:
      - app_network

  nginx:
    image: nginx:alpine
    container_name: genetic_tree_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
    networks:
      - app_network

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  app_network:
    driver: bridge
EOF

# Создаём .env
cat > .env << 'EOF'
ALLOW_ORIGINS=https://yourdomain.com
DATABASE_HOST=db.yourdomain.com
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=YOUR_DB_PASSWORD
DATABASE_NAME=genetic_tree
JWT_SECRET_KEY=YOUR_JWT_SECRET
BUCKET_NAME=your_bucket
ACCESS_KEY_ID=your_key
SECRET_ACCESS_KEY=your_secret
ENDPOINT_URL=https://s3.provider.com
REGION_NAME=us-east-1
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot
OPENAI_API_KEY=sk-your_key
EOF

# Создаём nginx.conf (init версия для SSL)
cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Получаем SSL
mkdir -p certbot/conf certbot/www
docker-compose up -d
sleep 30

docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email YOUR_EMAIL --agree-tos --no-eff-email \
  -d api.yourdomain.com

# Обновляем nginx на SSL версию
cat > nginx.conf << 'EOF'
upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 50M;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

docker-compose restart nginx
```

---

## 3. На сервере Frontend (yourdomain.com)

```bash
mkdir -p /opt/genetic-tree && cd /opt/genetic-tree

cat > docker-compose.yml << 'EOF'
services:
  frontend:
    image: YOUR_DOCKERHUB_USERNAME/genetic-tree-frontend:latest
    container_name: genetic_tree_frontend
    restart: unless-stopped
    networks:
      - app_network

  nginx:
    image: nginx:alpine
    container_name: genetic_tree_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - frontend
    networks:
      - app_network

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  app_network:
    driver: bridge
EOF

# nginx init (HTTP only)
cat > nginx.conf << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / {
            proxy_pass http://frontend:3000;
            proxy_set_header Host $host;
        }
    }
}
EOF

mkdir -p certbot/conf certbot/www
docker-compose up -d
sleep 30

docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email YOUR_EMAIL --agree-tos --no-eff-email \
  -d yourdomain.com

# nginx SSL версия
cat > nginx.conf << 'EOF'
events { worker_connections 1024; }
http {
    upstream frontend { server frontend:3000; }

    server {
        listen 80;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 301 https://$host$request_uri; }
    }

    server {
        listen 443 ssl http2;
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
}
EOF

docker-compose restart nginx
```

---

## 4. На сервере Telegram Bot

```bash
mkdir -p /opt/genetic-tree && cd /opt/genetic-tree

cat > docker-compose.yml << 'EOF'
services:
  telegram_bot:
    image: YOUR_DOCKERHUB_USERNAME/genetic-tree-bot:latest
    container_name: genetic_tree_bot
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/app/data
EOF

cat > .env << 'EOF'
TELEGRAM_BOT_TOKEN=your_token
BACKEND_URL=https://api.yourdomain.com
OPENAI_API_KEY=sk-your_key
BROADCAST_ENABLED=true
EOF

docker-compose up -d
```

---

## Обновление образов

```bash
# На любом сервере
docker-compose pull
docker-compose up -d
```

## Команды

```bash
docker-compose logs -f      # логи
docker-compose restart      # перезапуск
docker-compose down         # остановка
docker-compose pull && docker-compose up -d  # обновление
```
