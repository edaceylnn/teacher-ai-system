# Business Analysis Plan

Bu doküman projeyi iş analistliği açısından takip etmek için kullanılacak.

## Bu Projede Öğrenilecek İş Analistliği Becerileri

- Problem analizi
- Paydaş analizi
- Kullanıcı hikayesi yazma
- Kabul kriteri tanımlama
- MVP kapsamı belirleme
- Süreç akışı çıkarma
- Gereksinim önceliklendirme
- Ürün metrikleri tanımlama
- Edge case ve risk analizi

## Paydaşlar

| Paydaş | İhtiyaç | Başarı Beklentisi |
| --- | --- | --- |
| Öğretmen | Zaman kazanmak | Hızlı yorum ve mesaj üretimi |
| Öğrenci | Adil ve kişisel geri bildirim | Genelleme olmayan yorum |
| Veli | Anlaşılır bilgilendirme | Kısa, yapıcı ve net mesaj |
| Okul yöneticisi | Düzenli raporlama | Sınıf genelinde görünür metrikler |

## Ana Kullanıcı Hikayeleri

### US-001: Sınıf Oluşturma

Bir öğretmen olarak sınıf oluşturmak istiyorum, böylece öğrencilerimi sınıflara göre takip edebilirim.

Kabul kriterleri:

- Öğretmen sınıf adı girebilir.
- Öğretmen sınıf seviyesini seçebilir.
- Oluşturulan sınıf listede görünür.

### US-002: Öğrenci Ekleme

Bir öğretmen olarak öğrenci eklemek istiyorum, böylece not ve devamsızlık bilgilerini takip edebilirim.

Kabul kriterleri:

- Öğrenci adı ve soyadı girilebilir.
- Öğrenci bir sınıfa bağlanır.
- Öğrenci profili açılabilir.

### US-003: AI Karne Yorumu Üretme

Bir öğretmen olarak öğrenci verilerinden otomatik karne yorumu üretmek istiyorum, böylece dönem sonu yorumlarını daha hızlı hazırlayabilirim.

Kabul kriterleri:

- Sistem not ve devamsızlık verisini kullanır.
- Yorum kişiye özel görünür.
- Öğretmen yorumu düzenleyebilir.
- Yorum kaydedilebilir.

### US-004: Veli Mesajı Üretme

Bir öğretmen olarak veliye gönderilecek kısa mesaj üretmek istiyorum, böylece iletişimimi daha hızlı ve tutarlı yönetebilirim.

Kabul kriterleri:

- Mesaj kısa ve anlaşılır olur.
- Mesaj suçlayıcı veya kırıcı bir dil kullanmaz.
- Öğretmen mesaj tonunu seçebilir.

## Süreç Akışı

1. Öğretmen giriş yapar.
2. Sınıf oluşturur.
3. Öğrenci ekler.
4. Not ve devamsızlık girer.
5. AI karne yorumu üretir.
6. Çıktıyı kontrol eder.
7. Gerekirse düzenler.
8. Kaydeder veya rapora ekler.

## Önceliklendirme

MoSCoW yaklaşımı:

### Must Have

- Öğrenci ve sınıf yönetimi
- Not girişi
- AI karne yorumu
- AI veli mesajı

### Should Have

- Devamsızlık takibi
- AI çıktısını kaydetme
- Basit dashboard

### Could Have

- PDF rapor
- Ders planı üretimi
- Eksik konu analizi

### Won't Have for MVP

- Ödeme sistemi
- Gelişmiş rol yönetimi
- Multi-agent mimari

