FROM python:3.11-slim

WORKDIR /app

# ffmpeg нужен faster-whisper для декодирования аудио (ogg/opus от Telegram)
# Node.js для сборки Mini App фронтенда
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Предзагрузка модели Whisper при сборке образа (чтобы не скачивать при первом запросе)
ARG WHISPER_MODEL_SIZE=small
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('${WHISPER_MODEL_SIZE}', device='cpu', compute_type='int8')"

# Сборка Mini App фронтенда
COPY webapp_frontend/package.json webapp_frontend/package-lock.json* webapp_frontend/
RUN cd webapp_frontend && npm ci --production=false 2>/dev/null || npm install
COPY webapp_frontend/ webapp_frontend/
RUN cd webapp_frontend && npm run build

COPY . .

# WebApp порт (для nginx proxy)
EXPOSE 8080

CMD ["python", "main.py"]
