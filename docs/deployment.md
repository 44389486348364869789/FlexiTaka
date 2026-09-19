# FlexiTaka Production Deployment Guide

## 1. Domain Separation & Architecture

| Domain | Target Service | Purpose |
|--------|----------------|---------|
| `https://flexitaka.com` | Next.js Frontend (Port 3000) | Public Customer Website & Web App |
| `https://flexitaka.online` | FastAPI Backend (Port 8000) | REST API & Infrastructure |

---

## 2. Docker Compose Deployment

```yaml
version: "3.8"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: flexitaka-backend
    restart: always
    environment:
      - APP_ENV=production
      - MONGODB_URI=mongodb://mongo:27017
      - MONGODB_DATABASE=flexitaka
      - REDIS_URL=redis://redis:6379/0
      - STORAGE_ROOT=/data/flexitaka/uploads
      - PUBLIC_API_BASE_URL=https://flexitaka.online/api/v1
      - CUSTOMER_WEBSITE_URL=https://flexitaka.com
      - JWT_SECRET=GENERATE_SECURE_RANDOM_SECRET
    volumes:
      - flexitaka_uploads:/data/flexitaka/uploads
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6.0
    container_name: flexitaka-mongo
    restart: always
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: flexitaka-redis
    restart: always
    volumes:
      - redis_data:/data

volumes:
  mongo_data:
  redis_data:
  flexitaka_uploads:
```

---

## 3. Nginx Reverse Proxy Configuration

### Backend: `https://flexitaka.online`
```nginx
server {
    listen 443 ssl http2;
    server_name flexitaka.online;

    ssl_certificate /etc/letsencrypt/live/flexitaka.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/flexitaka.online/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### Customer Website: `https://flexitaka.com`
```nginx
server {
    listen 443 ssl http2;
    server_name flexitaka.com www.flexitaka.com;

    ssl_certificate /etc/letsencrypt/live/flexitaka.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/flexitaka.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 4. Automated Backup Procedure

Add a nightly cron job:
```bash
# Nightly MongoDB Dump at 2:00 AM
0 2 * * * docker exec flexitaka-mongo mongodump --out=/backup/mongo-$(date +\%Y\%m\%d)
# Nightly File Proofs Backup at 2:30 AM
30 2 * * * tar -czf /backup/uploads-$(date +\%Y\%m\%d).tar.gz /data/flexitaka/uploads
```
