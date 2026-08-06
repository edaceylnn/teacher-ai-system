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

## Test

```bash
cd backend
pytest
```

## Durum

Proje aktif olarak geliştirilen bir MVP'dir. Temel CRUD akışları, öğrenci profili, not/devamsızlık yönetimi, AI rapor üretimi ve pagination desteği çalışır durumdadır.
