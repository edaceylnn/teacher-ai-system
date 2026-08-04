# Teacher AI System

AI destekli öğretmen yönetim sistemi.

Teacher AI System; öğretmenlerin sınıf, öğrenci, not, devamsızlık ve değerlendirme süreçlerini tek panel üzerinden yönetmesini sağlayan bir web uygulamasıdır. Sistem, öğrenci verilerini kullanarak AI destekli karne yorumu, veli mesajı, gelişim önerisi ve rapor çıktıları üretir.

## Problem

Öğretmenler dönem içinde ve dönem sonunda çok sayıda tekrarlı değerlendirme işi yapar:

- Öğrenci notlarını ve devamsızlıklarını takip etmek
- Her öğrenci için kişisel karne yorumu yazmak
- Veliye uygun, yapıcı ve net mesaj hazırlamak
- Öğrenci gelişimini anlaşılır şekilde raporlamak
- Sınıf ve öğrenci bazlı bilgileri düzenli tutmak

Bu süreçler zaman alır, manuel ilerlediği için tutarlılık zorlaşır ve yoğun dönemlerde öğretmenin üzerindeki operasyonel yük artar.

## Çözüm

Teacher AI System, öğretmenlerin öğrenci verilerini yapılandırılmış şekilde yönetmesini ve bu verilerden AI destekli çıktılar üretmesini sağlar.

Sistem şu temel akışa odaklanır:

1. Öğretmen sınıf oluşturur.
2. Öğrenci ekler.
3. Ders, not ve devamsızlık bilgilerini girer.
4. AI, öğrencinin verilerine göre karne yorumu üretir.
5. AI, veliye gönderilebilecek kısa ve yapıcı mesaj hazırlar.
6. Öğretmen çıktıyı düzenler, kaydeder ve rapora dönüştürür.

## Temel Özellikler

- Öğretmen paneli
- Sınıf yönetimi
- Öğrenci yönetimi
- Ders ve not takibi
- Devamsızlık takibi
- AI destekli karne yorumu
- AI destekli veli mesajı
- Öğrenci gelişim önerileri
- AI çıktısı kaydetme
- PDF raporlama

## MVP Kapsamı

İlk sürüm, öğretmenin temel öğrenci verisini girip AI destekli değerlendirme çıktısı almasına odaklanır.

MVP içinde:

- Öğretmen girişi
- Sınıf oluşturma
- Öğrenci ekleme
- Ders ve not girişi
- Devamsızlık girişi
- AI karne yorumu üretme
- AI veli mesajı üretme
- AI çıktısını kaydetme

MVP dışında:

- Ödeme sistemi
- Gelişmiş admin paneli
- Mobil uygulama
- Gerçek MEB entegrasyonu
- Tam multi-agent mimari

## Teknik Mimari

Planlanan teknoloji yapısı:

- Frontend: React veya Next.js
- Backend: FastAPI
- Database: PostgreSQL
- AI: OpenAI API
- PDF: ReportLab veya HTML to PDF
- Deployment: Render, Railway veya Coolify

## Backend

Backend API, FastAPI ile geliştirilir.

Mevcut backend kapsamı:

- FastAPI uygulama iskeleti
- `/health` endpoint'i
- Ortam ayarları
- SQLAlchemy database katmanı
- PostgreSQL uyumlu domain modelleri
- Alembic migration yapısı
- Öğretmen CRUD endpointleri
- Sınıf CRUD endpointleri
- Öğrenci CRUD endpointleri
- Ders CRUD endpointleri
- Not CRUD endpointleri
- Devamsızlık CRUD endpointleri
- Öğrenci profil endpoint'i
- Demo seed verisi
- Model ve endpoint testleri

İlk domain modelleri:

- Teacher
- Classroom
- Student
- Lesson
- Grade
- Attendance
- AIOutput

## Frontend

Frontend React + Vite ile gelistirilir.

Mevcut frontend kapsamı:

- Ogretmen dashboard iskeleti
- Sinif ve ogrenci listeleme
- Ogrenci profil ozeti
- Ders, not ve devamsizlik form alanlari
- Backend API entegrasyonu

Lokal kurulum:

```bash
cd frontend
npm install
```

Calistirma:

```bash
npm run dev
```

Lokal kurulum:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
```

Çalıştırma:

```bash
uvicorn app.main:app --reload
```

Test:

```bash
pytest
```

Migration:

```bash
alembic upgrade head
```

Demo veri:

```bash
python -m app.db.seed
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

İlk CRUD endpointleri:

- `POST /teachers`
- `GET /teachers`
- `GET /teachers/{teacher_id}`
- `PATCH /teachers/{teacher_id}`
- `DELETE /teachers/{teacher_id}`
- `POST /classrooms`
- `GET /classrooms`
- `GET /classrooms/{classroom_id}`
- `PATCH /classrooms/{classroom_id}`
- `DELETE /classrooms/{classroom_id}`
- `POST /students`
- `GET /students`
- `GET /students/{student_id}`
- `GET /students/{student_id}/profile`
- `PATCH /students/{student_id}`
- `DELETE /students/{student_id}`
- `POST /lessons`
- `GET /lessons`
- `GET /lessons/{lesson_id}`
- `PATCH /lessons/{lesson_id}`
- `DELETE /lessons/{lesson_id}`
- `POST /grades`
- `GET /grades`
- `GET /grades/{grade_id}`
- `PATCH /grades/{grade_id}`
- `DELETE /grades/{grade_id}`
- `POST /attendance-records`
- `GET /attendance-records`
- `GET /attendance-records/{attendance_id}`
- `PATCH /attendance-records/{attendance_id}`
- `DELETE /attendance-records/{attendance_id}`

## AI Özellikleri

AI çıktıları öğrencinin gerçek verilerine dayanacak şekilde tasarlanır.

İlk AI çıktıları:

- Karne yorumu
- Veli mesajı
- Öğrenci gelişim önerisi

Planlanan ileri seviye AI özellikleri:

- Eksik konu analizi
- Ders planı üretimi
- Müfredat dokümanlarına dayalı RAG asistanı
- Uzman agent'larla görev yönlendirme

## İş Analizi Dokümanları

Proje kapsamı ve gereksinimleri aşağıdaki dokümanlarla takip edilir:

- [Product Brief](docs/product-brief.md)
- [Business Analysis Plan](docs/business-analysis-plan.md)
- [Sprint 01 Backlog](docs/sprint-01-backlog.md)

## Demo Senaryosu

Bir öğretmen 5-A sınıfına öğrenci ekler. Öğrencinin Matematik ve Türkçe notlarını, devamsızlık bilgisini ve kısa gözlem notunu girer. Sistem bu bilgilerden:

- Öğrenciye özel karne yorumu
- Veliye gönderilecek kısa mesaj
- Öğrenci için gelişim önerileri

üretir.

## Proje Durumu

Proje başlangıç aşamasındadır. İlk hedef, AI destekli karne yorumu ve veli mesajı üreten çalışan MVP sürümünü tamamlamaktır.
