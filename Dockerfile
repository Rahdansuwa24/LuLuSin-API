FROM node:20-bookworm-slim

WORKDIR /app

# Lewati pengunduhan browser Chromium otomatis oleh Puppeteer untuk menghemat kuota & ukuran image
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Salin package manifest
COPY package*.json ./

# Install dependensi
RUN npm ci --omit=dev

# Salin seluruh source code
COPY . .

# Buat direktori upload gambar soal
RUN mkdir -p public/images/questionImage

# Konfigurasi environment bawaan container
ENV PORT=3002
ENV NODE_ENV=production
ENV DISABLE_PUPPETEER_SCRAPER=true

EXPOSE 3002

CMD ["node", "app.js"]
