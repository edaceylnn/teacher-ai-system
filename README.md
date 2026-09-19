# Teacher AI System

Teacher AI System, öğretmenlerin sınıf, öğrenci, değerlendirme, yoklama, ödev ve AI destekli raporlama süreçlerini tek panelden yönetebilmesi için geliştirilmiş bir web uygulamasıdır.

Proje; öğretmenin girdiği öğrenci verilerini kullanarak karne yorumu ve veli mesajı üretir, öğretmenin bu çıktıları düzenleyip kaydedebilmesini sağlar.

## Öne Çıkan Özellikler

- Sınıf, öğrenci, ders, değerlendirme, yoklama ve ödev yönetimi
- Öğrenci detay sayfasında akademik durum, devam bilgisi ve veli iletişim bilgileri
- Ders bazlı yoklama oturumları ve toplu devamsızlık girişi
- Değerlendirme bazlı toplu not/ödev sonucu girişi
- Searchable select/input bileşenleri
- Backend destekli pagination
- OpenAI veya Google Gemini ile AI karne yorumu, veli mesajı, haftalık özet, eksik konu analizi ve ders planı üretimi (bkz. `backend/README.md` → AI Configuration)
- Üretilen AI çıktılarının düzenlenip kaydedilmesi
- Demo kullanımı için IP başına ve genel günlük AI üretim limiti

## Kullanılan Teknolojiler

- Frontend: React, Vite, CSS
- Backend: FastAPI, SQLAlchemy, Alembic
- Database: PostgreSQL
- AI: OpenAI API / Google Gemini API (sağlayıcı `AI_PROVIDER` ile seçilir)
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

Backend container'ı başlarken `alembic upgrade head`'i otomatik çalıştırır (bkz. `backend/docker-entrypoint.sh`), ayrı bir migration adımına gerek yoktur. Demo verisini yüklemek isterseniz:

```bash
docker compose exec backend python -m app.db.seed
```

Uygulama adresleri:

- Frontend: `http://127.0.0.1:5173`
- Backend docs: `http://127.0.0.1:8000/docs`

### Prod build

`docker-compose.prod.yml`, frontend'i (statik build + nginx, `frontend/Dockerfile`'ın `prod` hedefi) ve backend'i (healthcheck + non-root user + otomatik migration) prod moduna uygun şekilde çalıştırır. Gerekli değişkenler: `POSTGRES_PASSWORD`, `SECRET_KEY` (üretimde en az 32 karakter olmalı), `FRONTEND_BASE_URL`, `CORS_ORIGINS`, `VITE_API_BASE_URL` (frontend build-time'da API adresini bilmeli), `SMTP_HOST` ve `SMTP_FROM_EMAIL` (şifre sıfırlama e-postaları için — üretimde zorunlu, aksi halde uygulama başlamaz).

```bash
POSTGRES_PASSWORD=... SECRET_KEY=$(openssl rand -hex 32) \
  FRONTEND_BASE_URL=https://yourdomain.com CORS_ORIGINS=https://yourdomain.com \
  VITE_API_BASE_URL=https://api.yourdomain.com \
  SMTP_HOST=smtp.yourprovider.com SMTP_USERNAME=... SMTP_PASSWORD=... SMTP_FROM_EMAIL=no-reply@yourdomain.com \
  docker compose -f docker-compose.prod.yml up --build
```

Üretimde `/docs`, `/redoc` ve `/openapi.json` otomatik olarak kapatılır (bkz. `backend/app/main.py`). Demo seed script'i (`app.db.seed`) üretim ortamında `ALLOW_PROD_SEED=true` açıkça verilmeden çalışmayı reddeder — bilinen şifreli demo hesabının gerçek bir veritabanına yazılmasını önlemek için.

Demo giriş bilgileri:

- E-posta: `eda@example.com`
- Parola: `demo12345`

## Production Checklist

- `SECRET_KEY` en az 32 karakterlik güçlü ve ortama özel bir değer olmalı.
- `POSTGRES_PASSWORD`, `CORS_ORIGINS`, `FRONTEND_BASE_URL` ve build-time `VITE_API_BASE_URL` gerçek ortama göre ayarlanmalı.
- Şifre sıfırlama için `SMTP_HOST` ve `SMTP_FROM_EMAIL` üretimde zorunludur; SMTP hesabı gerçek gönderimle test edilmeli.
- AI özellikleri için `AI_PROVIDER` ile sağlayıcı seçilip ilgili API anahtarı (`OPENAI_API_KEY` veya `GEMINI_API_KEY`) tanımlanmalı; kurum/veli veri paylaşımı onay süreci uygulama dışında işletilmelidir. Public demo'da `AI_DAILY_LIMIT_PER_IP`/`AI_DAILY_LIMIT_GLOBAL` ile günlük üretim sınırlandırılmalıdır.
- Yayın ortamında HTTPS, veritabanı yedekleme, log saklama ve veri silme/iade prosedürleri netleştirilmeli.
- `alembic upgrade head`, backend container başlangıcında otomatik çalışır; canlı veri taşıma gerektiren migration'lar ayrıca prova edilmelidir.
- **Public demo giriş bilgileri gerçek, tam yetkili bir hesaptır** — herkes bu bilgilerle giriş yapıp sınıf/öğrenci silebilir, kendi şifresini değiştirip hesabı kilitleyebilir veya kendi hesabını (`DELETE /teachers/{id}`) silebilir. Bunu kabul edilebilir kılan şey, demoyu düzenli olarak sıfırlayan bir zamanlanmış görevdir — sunucunuzda crontab'a şunun gibi bir satır ekleyin (Docker Compose ile çalıştırıyorsanız):
  ```
  0 3 * * * cd /path/to/teacher-ai-system && docker compose -f docker-compose.prod.yml exec -T -e ALLOW_PROD_SEED=true backend python -m app.db.seed --reset >> /var/log/teacher-ai-reset.log 2>&1
  ```
  Bu, ziyaretçilerin sildiği/değiştirdiği/kirlettiği her şeyi (dahil demo şifresi) her gece sıfırlar — bkz. `backend/app/db/seed.py`'deki `reset_demo_data`.
- **HTTPS için önünüze bir reverse proxy koyduğunuzda `FORWARDED_ALLOW_IPS`'i doğrulayın.** Login/kayıt/AI günlük limitleri ve audit log'daki `client_ip` hepsi "isteğin geldiği IP"ye göre çalışır (`app/core/rate_limit.py`, `app/core/audit.py`) — proxy araya girince bu, gerçek ziyaretçi IP'si yerine proxy'nin kendi adresi olur ve **tüm ziyaretçiler tek bir kimlikte toplanır** (biri diğerini kilitleyebilir). uvicorn varsayılan olarak sadece `127.0.0.1`'den gelen `X-Forwarded-For` başlığına güvenir (`docker-entrypoint.sh`) — bu proxy'nizin container'dan görünen gerçek adresi değilse (ör. host seviyesinde aaPanel/nginx, Docker'ın published port'una bağlanıyorsa genelde Docker bridge gateway IP'si görünür, `127.0.0.1` değil), `FORWARDED_ALLOW_IPS` ortam değişkenini doğru adrese ayarlamanız gerekir. `ENVIRONMENT=production` iken bu hâlâ varsayılandaysa başlangıçta bir log uyarısı görürsünüz (`warn_if_forwarded_allow_ips_are_default`, `app/core/security.py`) — üretim log'larında bunu arayın.

## Test

```bash
cd backend
.venv/bin/python -m pytest
```

Gerçek tarayıcı smoke testleri:

```bash
cd frontend
npm run test:e2e
```

`test:e2e`, Playwright üzerinden backend ve frontend dev server'larını otomatik başlatır; mevcut server varsa onu kullanır.

Tüm yerel kontroller:

```bash
make test
```

## Durum

Proje aktif olarak geliştirilen bir MVP'dir. Temel CRUD akışları, öğrenci profili, değerlendirme/yoklama yönetimi, ders programı, ödev takibi, AI rapor üretimi, eksik konu analizi, ders planı üretimi, PDF'e yazdırma ve pagination desteği çalışır durumdadır.

Uygulama token tabanlı öğretmen oturumu ile çalışır. Backend sınıf, öğrenci, değerlendirme, yoklama, ödev, ders programı ve AI çıktılarını oturumdaki öğretmene göre izole eder.
