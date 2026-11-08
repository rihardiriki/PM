# PM – Permintaan Packaging

PWA (Progressive Web App) untuk membuat permintaan material packing per SPK. Bisa di-install di HP/PC dan tetap jalan offline.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Aplikasi utama |
| `manifest.json` | Konfigurasi install (nama, ikon, warna) |
| `sw.js` | Service worker (cache & offline) |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | Ikon aplikasi |
| `logo.svg`, `logo-mark.svg`, `logo-mark-transparan.png`, `logo-horizontal.svg`, `logo-horizontal.png`, `favicon-32.png` | Logo (SVG & PNG): ikon, tanpa latar, dan versi horizontal dengan teks |
| `.github/workflows/pages.yml` | Deploy otomatis ke GitHub Pages |

## Beberapa customer dalam satu SPK

Customer dipilih **per ukuran roll**, bukan per SPK. Contoh: dalam 1 SPK ada 3 ukuran roll, ukuran 100 → Varion, ukuran 200 → Supernova, ukuran 300 → Pakar. Tombol **＋ Customer baru** ada di tiap kartu ukuran roll.

- Form menampilkan ringkasan roll & pallet per customer.
- Dokumen, Cetak, PDF, dan WhatsApp mengelompokkan roll per customer lengkap dengan subtotal (jika customer lebih dari satu).
- Pilihan **Type permintaan** (Pallet Kayu / Pallet Plastik) muncul jika salah satu roll memakai Varion atau Supernova.
- Data lama otomatis dimigrasi: customer SPK lama menjadi customer di semua roll-nya.
- `Code.gs` tidak perlu diubah.

## Form permintaan per ukuran roll & customer

Setiap variasi ukuran roll (customer + tipe + ukuran) punya setelan sendiri: tipe packing (Suspended / Majemuk / Box), tujuan (Lokal / Ekspor), posisi roll, isi roll per pallet, dan type permintaan (khusus Varion / Supernova). Daftar item permintaan packaging di form juga dipisah per ukuran roll dan customer, lengkap dengan pilihan board dan layer besi masing-masing. Bagian **Permintaan optional** (Particle, Tali, Stretch Film, dll.) tidak dipisah per variasi roll maupun customer: satu daftar per SPK dengan satu tombol tambah. Variasi baru menyalin setelan variasi sebelumnya. Penyangga = ukuran roll + 17 (Ekspor) atau + 15 (Lokal). Dokumen, Cetak, PDF, dan WhatsApp tetap menggabungkan item per SPK. Draft lama dimigrasi otomatis: setelan SPK disalin ke tiap roll, dan item manual lama dipindah ke roll pertama, sedangkan item optional lama digabung ke satu daftar per SPK.

## Cetak & PDF: menyesuaikan isi

Jumlah lembar A4 mengikuti isi dokumen, tidak dipaksa 1 lembar. Ukuran huruf tetap normal, halaman baru dibuat otomatis, dan baris tabel tidak terpotong di tengah. **Unduh PDF** memberi nomor halaman (`Halaman 1 / 3`) di bagian bawah. Catatan khusus dan kotak tanda tangan selalu ada di halaman terakhir. Setiap SPK dimulai di halaman baru (SPK yang panjang boleh berlanjut ke halaman berikutnya sebelum SPK selanjutnya mulai), dan **Rekap Total Semua SPK** juga dimulai di halaman baru. Ini berlaku di Cetak dan PDF. Di WhatsApp, jika ada lebih dari 1 SPK, tombol **Kirim WhatsApp** membuka daftar pesan terpisah (satu per SPK dan satu untuk rekap) yang dikirim satu per satu, ditambah tombol **Kirim PDF lengkap**.

## Kirim ke Gudang

Di tab Dokumen ada tombol **📦 Kirim ke Gudang**. Tombol ini membuat file `NO-PERMINTAAN.pmg` (JSON) berisi no. permintaan, tanggal, pemohon, daftar SPK, customer, catatan, dan item (digabung per nama + satuan). Di HP, menu bagikan terbuka: pilih **PM Gudang** dan file langsung masuk ke app gudang. Jika menu bagikan file tidak tersedia, file diunduh dan bisa dibuka lewat menu bagikan atau "Buka dengan" PM Gudang. App gudang harus versi v2 ke atas. Jika `config.js` (dbUrl) sudah diisi (lihat `FIREBASE.md` di root repositori), tombol ini mengirim langsung dan permintaan muncul otomatis di app gudang tanpa file.

## Sudah Dikirim

Setelah gudang menyelesaikan penerimaan (semua item sesuai) dan menekan **Kirim ke Lokasi**, lokasi dan foto muncul di Beranda → **Sudah Dikirim** (badge angka menandai yang baru). Butuh sambungan Firebase (lihat `FIREBASE.md`).

## Upload ke GitHub

```bash
cd pm-packaging-pwa
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/pm-packaging-pwa.git
git push -u origin main
```

Atau lewat web: buat repo baru → **Add file → Upload files** → seret semua isi folder (termasuk folder `.github`).

## Aktifkan GitHub Pages

1. Buka repo → **Settings → Pages**
2. Pada **Source**, pilih **GitHub Actions**
3. Tunggu proses di tab **Actions** selesai
4. Aplikasi tersedia di `https://USERNAME.github.io/pm-packaging-pwa/`

## Install di HP

- **Android (Chrome):** buka link → menu ⋮ → **Install app / Tambahkan ke layar utama**
- **iPhone (Safari):** buka link → tombol Share → **Add to Home Screen**

## Penyimpanan data

Aplikasi tidak memakai login. Semua data (riwayat, profil, customer, master item) tersimpan di perangkat/browser yang dipakai dan berjalan offline. Data tidak ikut ke perangkat lain.

## Update aplikasi

Setelah mengubah `index.html`, naikkan `VERSION` di `sw.js` (mis. `v1` → `v2`) lalu push, supaya cache di HP pengguna ikut diperbarui.

> Service worker hanya berjalan di HTTPS (GitHub Pages sudah HTTPS) atau `localhost`.
