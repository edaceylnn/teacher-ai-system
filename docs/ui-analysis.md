# Teacher AI System — UI/UX Analiz Raporu

Tarih: 2026-08-08
Kapsam: `frontend/` (React 19 + Vite, tek sayfa uygulama)

## 1. Genel Durum

Uygulama işlevsel olarak oldukça dolu: Dashboard, Sınıflar, Öğrenciler, Not
Defteri, Devamsızlık, Ders Programı, AI Raporları ve Profil olmak üzere 8
sayfa/route içeriyor. Backend (FastAPI) ile tam entegre, CRUD akışları,
sayfalama, arama, filtreleme, modaller ve AI çıktı üretimi gibi gerçek bir
ürün seviyesinde özellik seti var.

Ancak tüm arayüz **tek bir dosyada** (`src/main.jsx`, 4554 satır) ve **tek bir
CSS dosyasında** (`src/styles.css`, 2278 satır) toplanmış durumda. Bu, hem
kod sürdürülebilirliğini hem de tasarımın tutarlı biçimde geliştirilmesini
zorlaştırıyor. Görsel olarak uygulama "çalışan ama jenerik bir admin paneli"
izlenimi veriyor — bilgi mimarisi doğru, fakat görsel kimlik, derinlik ve
modern etkileşim detayları eksik.

## 2. Tespit Edilen Eksikler

### 2.1 Kod organizasyonu (tasarımı da doğrudan etkiliyor)

- Tüm sayfalar (`DashboardPage`, `ClassroomsPage`, `StudentsPage`,
  `GradebookPage`, `AttendancePage`, `SchedulePage`, `AIReportsPage`,
  `ProfilePage`...) ve tüm yardımcı bileşenler (`StatCard`, `Modal`,
  `SearchableSelect`, `Icon`, `NavItem` vb.) tek dosyada. Bu, bir bileşenin
  stilini değiştirmek isteyen birinin 4500 satır içinde arama yapmasını
  gerektiriyor ve tutarsızlıkların (örn. bazı yerlerde `card`, bazı yerlerde
  `analysis-card`, bazı yerlerde `classroom-card` gibi örtüşen class'lar)
  fark edilmesini zorlaştırıyor.
- Tek CSS dosyasında tasarım token'ları (`:root` içindeki değişkenler) sınırlı
  ve tutarlı kullanılmıyor: bazı gölgeler `rgba(53, 37, 205, 0.06)` gibi
  doğrudan yazılmış, bazı yerlerde CSS değişkeni kullanılmış. Ölçek
  (spacing/typography scale) tanımlı değil, her yerde farklı `px` değerleri
  serbestçe kullanılmış (12px, 14px, 16px, 18px, 22px, 24px... standart bir
  4px/8px grid'e oturmuyor).

### 2.2 Görsel kimlik zayıf / jenerik

- Renk paleti tek bir mor-mavi tonu (`--primary: #3525cd`) etrafında dönüyor;
  vurgu/ikincil renk (`--secondary: #006a61`) neredeyse hiç kullanılmamış.
  Sonuç: tüm sayfalar görsel olarak birbirinin aynı, öğrenciyi/sınıfı/notu
  ayırt eden bir renk kodlaması yok.
- Kartlarda tek tip düz gölge var (`box-shadow: 0 2px 4px rgba(53,37,205,.06)`)
  — hemen hemen her kart (`stat-card`, `chart-card`, `analysis-card`,
  `classroom-card`, `student-table-card`...) birebir aynı gölgeyi kullanıyor.
  Derinlik hiyerarşisi (öne çıkan / arka planda kalan içerik ayrımı) yok.
  Gradient kullanımı proje genelinde sadece 1 yerde (sidenav arka planı).
- Tipografi tek ağırlık skalası üzerinde: başlıklar `font-weight: 700-800`,
  gövde metni `400`, aradaki kademeler (500, 600) neredeyse hiç kullanılmamış.
  Başlık/gövde arasında büyüklük sıçraması sert (24px → 14px gibi), ara
  boyutlar (18px, 16px) eksik.
- Köşe yuvarlaklığı her yerde sabit 8px/12px — buton, kart, input, modal hepsi
  aynı radius'ta. Görsel bir "yumuşaklık/kesinlik" farkı hissettirilmiyor.

### 2.3 Etkileşim & mikro-animasyon eksikliği

- `transition` kullanımı sadece birkaç yerde var (kart hover, aktif satır
  vurgusu). Buton tıklamalarında, modal açılış/kapanışında, sayfa geçişlerinde
  hiçbir geçiş animasyonu yok — her şey aniden görünüp kayboluyor.
  `activeModal` state'i değiştiğinde modal fade/slide olmadan direkt DOM'a
  giriyor (`Modal` bileşeni, satır ~4528).
- Skeleton/loading state yok: `StatusLine` bileşeni sadece "Yükleniyor" yazısı
  gösteriyor (satır 4517-4526), spinner veya skeleton kart yok. Veri
  gelmeden önce kullanıcı boş bir sayfa görüyor.
- Empty state'ler ("Henüz sınıf yok.", "Bugün için ders programı yok.") sade
  metin, ikon veya illüstrasyon içermiyor — bu durumlar kullanıcıya "boş"
  hissi veriyor, yönlendirici bir CTA yok.
- Hover geri bildirimleri tutarsız: bazı satırlar/kartlar hover'da hafif
  kalkıyor (`translateY(-2px)`), bazı interaktif elemanlarda (nav-link,
  buton, sekme) hiçbir hover efekti tanımlı değil.

### 2.4 Dashboard ve veri görselleştirme

- Ana grafik (`Akademik Performans Eğilimi`) elle yazılmış sabit SVG path'ten
  ibaret (satır 2106-2136) — gerçek veriye bağlı değil, sabit koordinatlarla
  çizilmiş bir "dekor". Eksen etiketleri, tooltip, veri noktası işaretleri yok.
- Stat kartları (`StatCard`) sadece ikon + sayı + küçük trend metni
  içeriyor; karşılaştırmalı trend göstergesi (yukarı/aşağı ok, yüzde
  değişim, mini sparkline) yok.
- "Sınıf Kırılımı" ve "Dikkat Gerektiren Öğrenciler" tabloları düz metin
  satırları — risk seviyesini renk/rozet ile vurgulayan bir sistem yok
  (örn. ortalaması düşük öğrenci sadece `<em class="warning">` ile turuncu
  yazı rengi alıyor, güçlü bir görsel uyarı yok).

### 2.5 Navigasyon & bilgi mimarisi

- Sidebar sabit genişlikte (280px) ve daraltılabilir/collapse edilebilir
  değil — büyük ekranlarda bile kapatılamıyor, içerik alanını sürekli kısıtlıyor.
- Küçük ekranlarda (`max-width: 900px`) sidebar `position: static` olup
  sayfanın üstüne akıyor, fakat gerçek bir mobil navigasyon (hamburger menü,
  slide-in drawer, bottom nav) yok. Bu, tablet/mobilde kullanımı ciddi
  şekilde zorlaştırır.
- Üst çubukta (`Topbar`) global arama kutusu tanımlı (`.global-search`
  class'ı CSS'te var) ama `Topbar` bileşeninin JSX'inde hiç kullanılmıyor —
  ölü/kullanılmayan bir tasarım parçası (satur 1873-1909, sadece boş `<div />`
  var). Bildirim (notification) ikonu da yok.
- Breadcrumb yok; `ClassroomDetailPage`, `StudentDetailPage` gibi iç içe
  sayfalarda sadece "← Sınıflarıma dön" linki var, kullanıcı "neredeyim"
  sorusuna tam cevap alamıyor.

### 2.6 Erişilebilirlik & tutarlılık

- Renk kontrastı bazı yerlerde (`--muted: #464555` açık gri üstünde) sınırda;
  WCAG AA kontrolü yapılmamış görünüyor.
- Focus state'leri sadece birkaç elemanda tanımlı (`:focus-visible` sadece
  `student-row`/`students-row` için var); butonlarda, linklerde klavye
  navigasyonu için görsel focus ring genellikle yok.
- İkon seti olarak Google Material Symbols kullanılıyor (index.html içinde
  Google Fonts üzerinden yükleniyor) — bu marka kimliğine özgü değil, jenerik
  bir izlenim yaratan en büyük etkenlerden biri. Uygulamaya özgü bir ikon
  dili/çizim stili yok.
- Karanlık mod (dark mode) desteği yok; `:root` içinde tek bir sabit palet var.

## 3. Modernizasyon İçin Önerilen Yön

Aşağıdaki değişiklikler kod organizasyonuna dokunmadan (tek dosya yapısını
koruyarak) veya bileşenlere bölerek uygulanabilir; öncelik sırasına göre
listelendi.

### Öncelik 1 — Görsel kimlik ve derinlik
- Genişletilmiş bir tasarım token sistemi: birincil/ikincil/vurgu renkleri,
  4/8px spacing scale, tutarlı radius skalası (sm/md/lg/full).
  İkincil rengin (`--secondary`) aktif biçimde kullanılması (örn. pozitif
  trendler, tamamlanmış görevler için).
- Katmanlı gölge sistemi: kartlar arası hiyerarşi için 2-3 seviyeli gölge
  (hafif/orta/belirgin), hover'da gölgenin derinleşmesi.
  Gradient'lerin dashboard hero, stat kartları ve sidebar'da ölçülü kullanımı.
- Tipografi skalasının genişletilmesi (12/13/14/16/18/22/28px gibi net
  adımlarla) ve ağırlık kademelerinin (500/600) ara başlıklarda kullanılması.

### Öncelik 2 — Etkileşim ve akıcılık
- Modal için fade+scale giriş/çıkış animasyonu, sayfa geçişlerinde hafif
  fade, buton/kart hover-active state'lerinin tüm interaktif elemanlara
  tutarlı biçimde yayılması.
- Yükleme durumları için skeleton kartlar (gerçek veri gelene kadar kart
  şeklinde placeholder), spinner bileşeni.
- Empty state'lerin ikon + kısa açıklama + CTA butonu ile zenginleştirilmesi.

### Öncelik 3 — Dashboard & veri görselleştirme
- SVG grafiğin gerçek veriye bağlı, eksen etiketli, veri noktası
  tooltip'li hale getirilmesi (hafif bir chart kütüphanesi ya da
  parametrik SVG üretimi ile).
- Stat kartlarına trend oku/yüzde değişim/mini sparkline eklenmesi.
- Risk/durum göstergelerinin (düşük not ortalaması, eksik ödev, devamsızlık)
  renkli rozet (badge) sistemiyle güçlendirilmesi.

### Öncelik 4 — Navigasyon
- Sidebar'ın daraltılabilir (collapse to icon-only) hale getirilmesi.
- Mobilde gerçek bir drawer/hamburger navigasyon.
- Global arama kutusunun işlevsel hale getirilmesi veya kaldırılması
  (şu an ölü kod).
- İç sayfalarda breadcrumb eklenmesi.

### Öncelik 5 — Erişilebilirlik
- Tüm interaktif elemanlarda tutarlı `:focus-visible` stili.
- Kontrast oranlarının WCAG AA'ya göre gözden geçirilmesi.
- Karanlık mod için ikinci bir token seti (opsiyonel, kullanıcı tercihine göre).

## 4. Sonuç

Uygulamanın işlevsel iskeleti sağlam; eksik olan, bu iskeleti taşıyan görsel
katmanın modern bir ürün hissi vermesi. En yüksek etkiyi en düşük riskle
sağlayacak adımlar sırasıyla: (1) tasarım token'larının genişletilmesi ve
gölge/renk hiyerarşisinin kurulması, (2) mikro-animasyonların eklenmesi,
(3) dashboard grafiğinin gerçek veri + görsel zenginlikle güçlendirilmesi.
Bu üç adım, sayfa sayısı veya kod mimarisi değişmeden uygulamanın algılanan
kalitesini belirgin şekilde yükseltecektir.
