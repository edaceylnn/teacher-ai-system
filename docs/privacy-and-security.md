# Privacy and Security

Bu proje öğretmen, öğrenci, veli iletişim bilgisi, akademik kayıt ve AI çıktısı gibi hassas veriler işler.

## Uygulanan Kontroller

- Öğretmen girişi `/auth/login` üzerinden token tabanlı yapılır.
- Parolalar PBKDF2-SHA256 ile hashlenir; düz parola saklanmaz.
- Sınıf, öğrenci, not, devamsızlık, ders programı, ödev ve AI çıktısı endpointleri oturumdaki öğretmene göre izole edilir.
- Başka öğretmene ait kaynaklar 404 olarak döner.
- AI üretimleri yalnızca öğretmenin erişebildiği öğrenci/sınıf verisiyle oluşturulur.
- `SECRET_KEY` production ortamında değiştirilmelidir.

## Operasyonel Notlar

- Demo kullanıcısı: `eda@example.com / demo12345`
- Gerçek deployment için HTTPS, güvenli secret yönetimi, yedekleme ve veri saklama/silme politikaları eklenmelidir.
- Öğrenci verilerinin OpenAI API'ye gönderildiği açıkça belirtilmeli ve kurum politikalarına göre onay süreci işletilmelidir.
