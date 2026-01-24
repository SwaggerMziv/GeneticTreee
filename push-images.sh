#!/bin/bash

# Замени на свой Docker Hub username
DOCKER_USERNAME="YOUR_DOCKERHUB_USERNAME"

echo "=== Building and pushing Docker images ==="

# Login to Docker Hub
docker login

# Backend
echo "Building backend..."
docker build -t $DOCKER_USERNAME/genetic-tree-backend:latest ./backend
docker push $DOCKER_USERNAME/genetic-tree-backend:latest

# Frontend (нужен .env для build-time переменных)
echo "Building frontend..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api \
  -t $DOCKER_USERNAME/genetic-tree-frontend:latest ./frontend
docker push $DOCKER_USERNAME/genetic-tree-frontend:latest

# Telegram Bot
echo "Building telegram bot..."
docker build -t $DOCKER_USERNAME/genetic-tree-bot:latest ./telegram_bot
docker push $DOCKER_USERNAME/genetic-tree-bot:latest

echo "=== Done! ==="
echo "Images pushed:"
echo "  - $DOCKER_USERNAME/genetic-tree-backend:latest"
echo "  - $DOCKER_USERNAME/genetic-tree-frontend:latest"
echo "  - $DOCKER_USERNAME/genetic-tree-bot:latest"
