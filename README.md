# AYS - Araç Yönetim Sistemi (Vehicle Management System)

AYS, filo, araç ve nakliye operasyonlarını yönetmek için geliştirilmiş, yüksek performanslı ve gerçek zamanlı bir takip sistemidir.

## 🚀 Öne Çıkan Özellikler

- **Gerçek Zamanlı Takip**: WebSockets (Socket.io) entegrasyonu ile canlı dashboard güncellemeleri.
- **Yüksek Performanslı Mimari**:
  - **Streaming Exports**: On binlerce kaydı bellek tüketmeden (O(1) Memory) doğrudan HTTP yanıtına akıtan (Streaming) Excel ve PDF dışa aktarma motoru.
  - **Atomik Operasyonlar**: Veritabanı gidiş-dönüş süresini (roundtrip) minimize eden atomik güncelleme mimarisi.
  - **Mongoose .lean()**: Global düzeyde optimize edilmiş salt okunur sorgular ile %70'e varan bellek tasarrufu.
  - **Gzip/Brotli Sıkıştırma**: Tüm JSON yanıtları için yerleşik sıkıştırma desteği.
- **Güvenlik (Production-Ready)**:
  - **Account Lockout**: Hatalı giriş denemelerine karşı otomatik hesap kilitleme mekanizması.
  - **Helmet & Security Headers**: Modern web güvenlik standartlarına tam uyumluluk.
  - **Audit Logging**: Asenkron (non-blocking) çalışan detaylı işlem denetim izleri.
  - **ReDoS Koruması**: Arama filtrelerinde düzenli ifade saldırılarına karşı önlem.
- **Uluslararasılaştırma (i18n)**: Türkçe ve İngilizce dil desteği.
- **API Dokümantasyonu**: `/api` endpoint'i üzerinden erişilebilen kapsamlı Swagger dokümantasyonu.

## 🛠️ Teknik Yığın

- **Framework**: [NestJS](https://nestjs.com/)
- **Veritabanı**: [MongoDB](https://www.mongodb.com/) (Mongoose)
- **Caching**: Bellek İçi (In-Memory) Önbellekleme
- **Orkestrasyon**: [Podman](https://podman.io/) / [Docker](https://www.docker.com/)

## 📦 Kurulum ve Çalıştırma

### Yerel Geliştirme (Local)

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
2. `.env` dosyasını oluşturun (bakınız `.env.example`).
3. Uygulamayı başlatın:
   ```bash
   npm run start:dev
   ```

### Konteyner (Docker/Podman)

Orkestrasyon dosyası tüm bağımlılıkları (MongoDB) otomatik olarak ayağa kaldırır:

```bash
podman-compose up -d --build
```
*(Docker kullanıyorsanız `docker-compose` komutunu tercih edebilirsiniz.)*

## 🧪 Testler

```bash
# Birim Testler
npm run test

# E2E (Uçtan Uca) Testler
npm run test:e2e
```

## 📜 Lisans

Bu proje [MIT](LICENSE) lisansı ile korunmaktadır.
