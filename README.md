# Teacher AI System

Teacher AI System, öğretmenlerin sınıf, öğrenci, not, devamsızlık ve AI destekli değerlendirme süreçlerini tek panelden yönetebilmesi için geliştirilmiş bir web uygulamasıdır.

Proje; öğretmenin girdiği öğrenci verilerini kullanarak karne yorumu ve veli mesajı üretir, öğretmenin bu çıktıları düzenleyip kaydedebilmesini sağlar.

## Öne Çıkan Özellikler

- Sınıf, öğrenci, ders, not ve devamsızlık yönetimi
- Öğrenci detay sayfasında akademik durum, devam bilgisi ve veli iletişim bilgileri
- Takvim tabanlı devamsızlık takibi
- Searchable select/input bileşenleri
- Backend destekli pagination
- OpenAI API ile AI karne yorumu ve veli mesajı üretimi
- Üretilen AI çıktılarının düzenlenip kaydedilmesi

## Kullanılan Teknolojiler

- Frontend: React, Vite, CSS
- Backend: FastAPI, SQLAlchemy, Alembic
- Database: PostgreSQL
- AI: OpenAI API
- Test: Pytest

## Proje Yapısı

```text
teacher-ai-system/
├── backend/   # FastAPI API, database modelleri, migration ve testler
├── frontend/  # React + Vite arayüzü
└── docs/      # Ürün ve analiz dokümanları
```

## Lokal Çalıştırma

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend ayarları için `frontend/.env.example` dosyasını `.env.local` olarak kopyalayabilirsiniz.

## Docker ile Çalıştırma

```bash
docker compose up --build
```

İlk çalıştırmadan sonra ayrı bir terminalde migration ve demo verisini yükleyin:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.db.seed
```

Uygulama adresleri:

- Frontend: `http://127.0.0.1:5173`
- Backend docs: `http://127.0.0.1:8000/docs`

### Prod build

`docker-compose.prod.yml`, frontend'i (statik build + nginx, `frontend/Dockerfile`'ın `prod` hedefi) ve backend'i (healthcheck + non-root user) prod moduna uygun şekilde çalıştırır. Gerekli değişkenler: `POSTGRES_PASSWORD`, `SECRET_KEY` (üretimde en az 32 karakter olmalı), `FRONTEND_BASE_URL`, `CORS_ORIGINS`, `VITE_API_BASE_URL` (frontend build-time'da API adresini bilmeli).

```bash
POSTGRES_PASSWORD=... SECRET_KEY=$(openssl rand -hex 32) \
  FRONTEND_BASE_URL=https://yourdomain.com CORS_ORIGINS=https://yourdomain.com \
  VITE_API_BASE_URL=https://api.yourdomain.com \
  docker compose -f docker-compose.prod.yml up --build
```

Demo giriş bilgileri:

- E-posta: `eda@example.com`
- Parola: `demo12345`

## Test

```bash
cd backend
.venv/bin/python -m pytest
```

Tüm yerel kontroller:

```bash
make test
```

## Durum

Proje aktif olarak geliştirilen bir MVP'dir. Temel CRUD akışları, öğrenci profili, not/devamsızlık yönetimi, ders programı, ödev takibi, AI rapor üretimi, eksik konu analizi, ders planı üretimi, PDF'e yazdırma ve pagination desteği çalışır durumdadır.

Uygulama token tabanlı öğretmen oturumu ile çalışır. Backend sınıf, öğrenci, not, devamsızlık, ödev, ders programı ve AI çıktılarını oturumdaki öğretmene göre izole eder.
