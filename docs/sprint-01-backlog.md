# Sprint 01 Backlog

Sprint hedefi: AI destekli karne yorumu ve veli mesajı üreten ilk öğretmen paneli MVP temelini kurmak.

Süre: 14 gün

## Sprint Çıktısı

Sprint sonunda kullanıcı şu akışı tamamlayabilmeli:

1. Sınıf oluştur.
2. Öğrenci ekle.
3. Öğrencinin not ve devamsızlık bilgisini gir.
4. AI karne yorumu üret.
5. AI veli mesajı üret.
6. Çıktıyı kaydet.

## Backlog

| ID | İş | Rol | Öncelik | Durum |
| --- | --- | --- | --- | --- |
| BA-001 | Ürün problemini ve hedef kullanıcıyı netleştir | İş Analisti | Must | Done |
| BA-002 | İlk kullanıcı hikayelerini yaz | İş Analisti | Must | Done |
| BA-003 | MVP kapsamını ve kapsam dışını belirle | İş Analisti | Must | Done |
| BA-004 | Ürün metriklerini ve temel raporlama ihtiyacını tanımla | İş Analisti | Should | Done |
| BA-005 | İlk veri ihtiyaçlarını iş gereksinimi olarak çıkar | İş Analisti | Must | Done |
| DEV-001 | Proje klasör yapısını oluştur | Developer | Must | Done |
| DEV-002 | Backend FastAPI iskeletini kur | Developer | Must | Done |
| DEV-003 | PostgreSQL modellerini oluştur | Developer | Must | Done |
| DEV-004 | Öğrenci ve sınıf CRUD endpointleri yaz | Developer | Must | Done |
| DEV-005 | Frontend dashboard iskeletini kur | Developer | Must | Done |
| AI-001 | OpenAI servis katmanı tasarla | AI Engineer | Must | Done |
| AI-002 | Karne yorumu structured output şeması oluştur | AI Engineer | Must | Done |
| AI-003 | Veli mesajı prompt şablonu oluştur | AI Engineer | Must | Done |
| QA-001 | Demo senaryosu için örnek veri hazırla | QA | Should | Todo |

## Günlük Plan

### Gün 1

- Repo ve klasör yapısı
- Product brief
- Business analysis plan
- Sprint backlog

### Gün 2

- FastAPI backend iskeleti - Done
- Health endpoint - Done
- Ortam değişkenleri
- Basit Docker hazırlığı - Todo

### Gün 3

- Database modelleri - Done
- Migration yapısı - Done
- Örnek seed veri - Done

### Gün 4

- Sınıf CRUD
- Öğrenci CRUD

### Gün 5

- Not ve devamsızlık endpointleri - Done

### Gün 6

- Frontend dashboard iskeleti - Done
- Sınıf ve öğrenci listeleme - Done

### Gün 7

- Öğrenci profil endpoint'i - Done
- Öğrenci profil ekranı - Todo

### Gün 8

- OpenAI servis katmanı - Done
- AI config ve model ayarları - Done

### Gün 9

- Karne yorumu prompt ve JSON şeması - Done

### Gün 10

- AI karne yorumu endpointi - Done

### Gün 11

- Veli mesajı üretimi - Done

### Gün 12

- AI çıktısını database'e kaydetme - Done

### Gün 13

- UI düzenleme, hata ve loading state'leri

### Gün 14

- Demo veri
- README güncelleme
- Kısa demo senaryosu

## Sprint Kabul Kriterleri

- Proje lokal ortamda çalıştırılabilir.
- En az bir sınıf ve öğrenci oluşturulabilir.
- Öğrenciye not girilebilir.
- AI karne yorumu üretilebilir.
- AI veli mesajı üretilebilir.
- Çıktılar kaydedilebilir.
- README başlangıç için yeterlidir.
