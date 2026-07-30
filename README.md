# 📸 DoubleBooth - Real-Time Shared Photobooth

DoubleBooth adalah aplikasi web photobooth kolaboratif real-time yang memungkinkan dua orang di dua device berbeda (misalnya PC-PC, PC-HP, atau HP-HP) bergabung dalam satu room, berpose bersama secara real-time, lalu menghasilkan satu strip foto photobooth (seperti di studio foto) yang siap diunduh atau dicetak.

## 🚀 Fitur Utama
1. **Real-time Live Sync (Socket.io)**: Pemilihan filter, frame, countdown, dan status persiapan disinkronkan secara real-time antar device.
2. **WebRTC Video Stream**: Feed kamera masing-masing device ditampilkan berdampingan di kedua layar secara real-time (Peer-to-Peer).
3. **High-Quality Captures**: Foto diambil dari kamera lokal masing-masing secara langsung (bukan dari stream kompresi WebRTC) lalu disinkronkan via socket untuk menjamin kualitas gambar strip yang jernih.
4. **Custom Filters & Frames**: Beragam filter (Vintage, Cyber Cyan, Noir) dan desain frame (Classic White, Dark Cyber, Pastel Hearts, Cute Stickers) yang bisa diubah langsung maupun pasca-foto.
5. **Cetak & Unduh**: Konfigurasi otomatis `@media print` untuk mencetak strip foto dengan ukuran standar photobooth (3.5 inch) dan tombol unduh format PNG.

---

## 🛠️ Persiapan dan Instalasi

Aplikasi ini menggunakan struktur monorepo. Anda dapat menginstal seluruh dependensi sekaligus dari root direktori.

1. **Instal Dependensi**:
   Buka terminal di direktori root `Project Photo` dan jalankan:
   ```bash
   npm run install:all
   ```
   *Perintah ini akan menginstal library di direktori `server/` dan `client/` secara otomatis.*

2. **Jalankan Aplikasi (Mode Development)**:
   Di direktori root, jalankan:
   ```bash
   npm run dev
   ```
   *Perintah ini akan menyalakan server Socket.io di port `5000` dan frontend React/Vite di port `5173` secara bersamaan.*

---

## 💻 Cara Menguji Aplikasi

Ada 2 metode untuk menguji aplikasi ini:

### Metode 1: Satu PC (Dua Tab Browser) — Paling Mudah & Cepat
Karena browser mengizinkan akses kamera di `localhost` tanpa konfigurasi tambahan, Anda bisa menguji fungsionalitas penuh di satu PC:
1. Jalankan aplikasi (`npm run dev`).
2. Buka Tab 1 di browser Anda: `http://localhost:5173`.
3. Masukkan nama Anda (misal: "Alice") dan klik **Buat Room Baru**.
4. Salin kode room yang muncul (atau salin Link Undangan).
5. Buka Tab 2 (direkomendasikan dalam Mode Incognito agar sesi socket tidak bentrok) atau gunakan browser berbeda (seperti Firefox/Edge).
6. Buka `http://localhost:5173?room=KODE_ROOM` (atau masukkan kode room secara manual).
7. Masukkan nama teman (misal: "Bob") dan klik **Bergabung ke Room**.
8. Setelah kedua tab menyalakan kamera dan mengklik **Saya Siap!**, Anda akan otomatis masuk ke **Studio Photobooth**.
9. Mulai berpose! Tekan **Mulai Foto** di salah satu layar.

---

### Metode 2: Dua Device Berbeda (Misal PC dan HP) dalam Satu Jaringan Wifi
Untuk menghubungkan 2 device berbeda di jaringan Wifi yang sama:

1. Cari IP lokal PC Anda (contoh: `192.168.1.5`).
   - Di Windows: Buka CMD dan ketik `ipconfig` (cari bagian IPv4 Address).
2. Di PC utama, buat room dan biarkan server berjalan.
3. Di device kedua (HP/PC lain), buka URL menggunakan IP lokal PC: `http://192.168.1.5:5173`.

#### ⚠️ PENTING: Mengatasi Masalah Izin Kamera (Blocked Camera on HTTP)
Browser modern melarang akses kamera pada koneksi HTTP biasa untuk alamat non-localhost (seperti `http://192.168.1.5:5173`). Berikut cara mengatasinya:

* **Untuk HP Android (Google Chrome)**:
  1. Buka Google Chrome di HP Anda.
  2. Buka alamat khusus: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
  3. Aktifkan (Enable) opsi tersebut.
  4. Pada kolom teks di bawahnya, masukkan URL frontend Anda: `http://192.168.1.5:5173` (sesuaikan IP lokal Anda).
  5. Klik tombol **Relaunch** Chrome di kanan bawah untuk me-restart browser.
  6. Sekarang, kamera HP Anda dapat diakses dan siap terhubung!

* **Untuk Laptop Lain (Chrome/Edge)**:
  Lakukan langkah yang sama seperti di atas melalui `chrome://flags` di laptop kedua tersebut.

---

## 🎨 Struktur Kode Sumber
- `server/server.js`: Menangani manajemen room (maks 2 orang) dan relay sinyal WebRTC serta sinkronisasi aksi photobooth.
- `client/src/hooks/useWebRTC.js`: Hook React yang mengelola koneksi socket dan stream peer WebRTC secara dinamis.
- `client/src/components/Lobby.jsx`: Landing page untuk membuat/gabung room.
- `client/src/components/Setup.jsx`: Ruang persiapan untuk menyalakan kamera, toggle ready, dan menyalin link undangan.
- `client/src/components/Booth.jsx`: Studio foto dengan dual preview, sinkronisasi filter/frame, countdown, dan flash.
- `client/src/components/Gallery.jsx`: Kanvas penggabungan foto side-by-side, kustomisasi teks, filter pasca-capture, unduh, dan cetak.
