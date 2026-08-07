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
2. Dashboard'u aç ve sınıf, öğrenci, not, devamsızlık özetlerini göster.
3. `5-A` sınıfını seç ve öğrenci listesinden `Ada Yilmaz` profilini aç.
4. Öğrenci profilinde not ortalamaları, devamsızlık özeti ve veli iletişim bilgilerini göster.
5. Not veya devamsızlık kaydı ekleyerek verinin anında güncellendiğini göster.
6. AI rapor ekranında karne yorumu, veli mesajı ve eksik konu analizi üret.
7. Üretilen metni düzenle ve `Düzenlemeleri Kaydet` akışını göster.
8. `PDF Dışa Aktar` ile tarayıcının PDF'e kaydetme akışını aç.
9. Ders programı ve ödev ekranlarını açarak MVP'nin öğretmenin haftalık takibini de desteklediğini göster.

## Demo Notları

- AI üretimi için `OPENAI_API_KEY` gerekir.
- API anahtarı yoksa CRUD, öğrenci profili, ders programı ve ödev akışları yine çalışır.
- Uygulama token tabanlı öğretmen oturumu ve kullanıcı bazlı backend veri izolasyonu ile çalışır.
