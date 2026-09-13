# Demo Scenario

Bu senaryo teknik olmayan bir kişiye 3 dakikalık MVP demosu yapmak için hazırlanmıştır.

## Hazırlık

```bash
cd backend
.venv/bin/python -m app.db.seed
```

Demo öğretmeni:

- Ad: Eda Ceylan
- E-posta: eda@example.com
- Parola: demo12345

## Akış

1. `eda@example.com / demo12345` ile giriş yap.
2. Dashboard'u aç ve sınıf, öğrenci, değerlendirme, yoklama ve ödev özetlerini göster.
3. `5-A` sınıfını seç ve öğrenci listesinden `Ada Yilmaz` profilini aç.
4. Öğrenci profilinde not ortalamaları, devamsızlık özeti ve veli iletişim bilgilerini göster.
5. Not Defteri'nde yeni bir değerlendirme oluştur, `Sonuç Gir` ile sınıf listesinden birkaç öğrenciye toplu puan kaydet.
6. Devamsızlık ekranında sınıf, ders ve tarih seçerek `Yoklama Aç`; `Tümünü Var İşaretle` ve tekil durum güncelleme akışını göster.
7. Ödevler ekranında yeni ödev oluştur, `Ödev Kontrolü` ile tamamlanma/puan bilgisini toplu kaydet.
8. AI rapor ekranında karne yorumu, veli mesajı ve eksik konu analizi üret.
9. Üretilen metni düzenle ve `Düzenlemeleri Kaydet` akışını göster.
10. `PDF Dışa Aktar` ile tarayıcının PDF'e kaydetme akışını aç.
11. Ders programını açarak haftalık takip ve hızlı yoklama/değerlendirme bağlantılarını göster.

## Demo Notları

- AI üretimi için `OPENAI_API_KEY` gerekir.
- API anahtarı yoksa CRUD, öğrenci profili, değerlendirme, yoklama, ders programı ve ödev akışları yine çalışır.
- Uygulama token tabanlı öğretmen oturumu ve kullanıcı bazlı backend veri izolasyonu ile çalışır.
