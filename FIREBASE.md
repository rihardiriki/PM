# Kirim ke Gudang otomatis (Firebase)

Sekali setup, sekitar 10 menit. Semua bisa dikerjakan dari HP.

## 1. Buat database
1. Buka https://console.firebase.google.com dan login dengan akun Google.
2. **Create a project** → beri nama (mis. `pm-packaging`) → matikan Google Analytics → **Create project**.
3. Menu **Build → Realtime Database → Create Database**.
4. Lokasi: **Singapore (asia-southeast1)**. Mode: **Start in locked mode** → **Enable**.

## 2. Pasang aturan keamanan
Di database tadi, buka tab **Rules**, hapus isinya, tempel ini, lalu **Publish**:

```json
{
  "rules": {
    "inbox": {
      "$kode": {
        ".read": "$kode.length >= 10",
        ".write": "$kode.length >= 10",
        "$id": { ".validate": "newData.hasChildren(['no','items','sent'])" }
      }
    },
    "outbox": {
      "$kode": {
        ".read": "$kode.length >= 10",
        ".write": "$kode.length >= 10",
        "$id": { ".validate": "newData.hasChildren(['no','sent'])" }
      }
    },
    "photos": {
      "$kode": {
        ".read": "$kode.length >= 10",
        ".write": "$kode.length >= 10",
        "$id": {
          "$n": { ".validate": "newData.isString() && newData.val().length < 450000" }
        }
      }
    }
  }
}
```

`inbox` = permintaan ke gudang, `outbox` = info pengiriman dari gudang, `photos` = foto lokasi. **Jika Anda sudah pernah memasang aturan lama, ganti dengan aturan ini lalu Publish ulang**, kalau tidak fitur Kirim ke Lokasi tidak bisa mengirim.

Artinya: data hanya bisa dibuka oleh orang yang tahu **kode gudang** (minimal 10 karakter). Daftar semua kode tidak bisa dilihat siapa pun.

## 3. Salin alamat database
Di tab **Data**, alamat ada di bagian atas, bentuknya:
`https://NAMA-default-rtdb.asia-southeast1.firebasedatabase.app`
(salin tanpa tanda `/` di akhir).

## 4. Isi `config.js` di GitHub
Buka `config.js` di repositori → ikon pensil (Edit) → ganti isinya:
```js
window.PMG_CONFIG = { dbUrl: 'https://NAMA-default-rtdb.asia-southeast1.firebasedatabase.app' };
```
→ **Commit changes**. Tunggu centang hijau di tab **Actions**.

## 5. Selesai
Tidak ada kode yang perlu dimasukkan. Kedua app memakai jalur data tetap (`jalur` di `config.js`). Tombol **📦 Kirim ke Gudang** langsung mengirim; permintaan muncul sendiri di tab **Masuk** gudang.

## Catatan
- Jalur data ditentukan oleh `jalur` di `config.js` (minimal 10 huruf/angka). Siapa pun yang tahu alamat database dan jalur ini bisa membaca data. Jika perlu lebih aman, pakai login akun.
- Permintaan yang dikirim ulang (nomor sama) memperbarui jumlah item di gudang, selama penerimaannya belum selesai.
- Data lebih dari 30 hari dibersihkan otomatis oleh app gudang.
- Jika internet mati saat menekan tombol, app memakai cara file (menu bagikan / unduh) sebagai cadangan.
- Notifikasi saat app gudang tertutup belum ada. Permintaan masuk begitu app gudang dibuka lagi.
- **Kirim ke Lokasi:** di app gudang, setelah penerimaan selesai dan semua item Sesuai, muncul kartu untuk mengisi lokasi dan 1-4 foto. Di app permintaan, hasilnya ada di Beranda → **Sudah Dikirim**. Foto dikompres otomatis (sekitar 300 KB per foto). Jika internet mati, pengiriman diantre dan terkirim sendiri saat tersambung.

---

# Login akun: PM Permintaan hanya untuk packing, PM Gudang hanya untuk gudang

Setelah langkah ini, data di database (permintaan, info pengiriman, foto) hanya bisa dibuka oleh akun yang terdaftar. Sebelum `apiKey` diisi, app memakai PIN dari `pin.js`.

## A. Aktifkan login
1. Firebase Console → **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
2. **Project settings (ikon roda gigi) → General → Web API Key**, salin.
3. Di `config.js` tambahkan `apiKey` (jangan hapus `dbUrl` yang sudah ada):
```js
window.PMG_CONFIG = { dbUrl: 'https://NAMA-default-rtdb.asia-southeast1.firebasedatabase.app', apiKey: 'ISI_WEB_API_KEY' };
```
Commit, tunggu centang hijau di tab **Actions**.

## B. Ganti aturan database
Realtime Database → tab **Rules** → ganti seluruh isi dengan ini → **Publish**:

```json
{
  "rules": {
    "roles": {
      "$uid": { ".read": "auth != null && auth.uid === $uid", ".write": false }
    },
    "pw": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.isNumber()"
      }
    },
    "inbox": {
      "$kode": {
        ".read": "$kode.length >= 10 && auth != null && root.child('roles').child(auth.uid).exists()",
        ".write": "$kode.length >= 10 && auth != null && root.child('roles').child(auth.uid).exists()",
        "$id": { ".validate": "newData.hasChildren(['no','items','sent'])" }
      }
    },
    "outbox": {
      "$kode": {
        ".read": "$kode.length >= 10 && auth != null && root.child('roles').child(auth.uid).exists()",
        ".write": "$kode.length >= 10 && auth != null && (root.child('roles').child(auth.uid).val() === 'gudang' || root.child('roles').child(auth.uid).val() === 'semua')",
        "$id": { ".validate": "newData.hasChildren(['no','sent'])" }
      }
    },
    "photos": {
      "$kode": {
        ".read": "$kode.length >= 10 && auth != null && root.child('roles').child(auth.uid).exists()",
        ".write": "$kode.length >= 10 && auth != null && (root.child('roles').child(auth.uid).val() === 'gudang' || root.child('roles').child(auth.uid).val() === 'semua')",
        "$id": {
          "$n": { ".validate": "newData.isString() && newData.val().length < 450000" }
        }
      }
    }
  }
}
```

## C. Buat akun tiap orang
1. **Authentication → Users → Add user**. Isi email dan kata sandi.
   Tips: tidak perlu email asli. Pakai bentuk `nama@pm-<departemen>.local`, mis. `raihan@pm-finishing.local`. App otomatis membaca **nama pengguna = raihan** dan **departemen = Finishing** dari email ini (tampil di foto profil kanan atas, dan terisi di form permintaan).
   Saat login, orang cukup mengetik **raihan**: app mencoba departemen yang terdaftar di `deptList` pada `config.js` (mis. `deptList: ['finishing', 'packaging', 'gudang']`) dan mengingat yang cocok di perangkat itu. Departemen baru: tambahkan namanya ke `deptList`. Cara lain tanpa `deptList`: ketik `raihan@finishing` atau email lengkap.
2. Salin **User UID** akun itu.
3. **Realtime Database → Data**: tambahkan node `roles`, di dalamnya kunci = UID tadi, nilai = salah satu:
   - `packing` → hanya PM Permintaan
   - `gudang` → hanya PM Gudang
   - `semua` → keduanya (untuk admin)
   (nilai berupa teks, contoh: `packing`)

## D. Sandi dibuat sendiri dan kedaluwarsa 6 bulan
Aturan `pw` di langkah B wajib dipasang. Cara kerjanya:
- Admin membuat akun dengan **sandi sementara** (langkah C) lalu memberi tahu user.
- Saat **login pertama**, app meminta user membuat sandi barunya sendiri (minimal 8 karakter, harus ada huruf dan angka). Sandi sementara tidak berlaku lagi.
- Tanggal ganti sandi disimpan di `pw/<UID>`. Jika sudah lebih dari **180 hari**, user diminta membuat sandi baru lagi sebelum bisa masuk. Batas hari bisa diubah dengan `sandiHari` di `config.js` (mis. `sandiHari: 90`).
- Tombol **Ganti sandi** di halaman depan memungkinkan user mengganti sandi kapan saja.
- **Memaksa user ganti sandi:** hapus node `pw/<UID>` di Realtime Database. Login berikutnya (maksimal sekitar 1 jam untuk yang sedang masuk) meminta sandi baru.
- **Lupa sandi:** email `@pm-packaging.local` tidak nyata, jadi tidak ada email reset. Admin membuka Authentication → Users → titik tiga → **Reset password** tidak akan terkirim; gantinya hapus akun lalu buat ulang dengan sandi sementara dan pasang lagi `roles/<UID baru>`.
- Batas 6 bulan dicek di app (sisi browser), bukan di server.

## Mencabut akses
Hapus node `roles/UID` atau nonaktifkan akun di Authentication. Perangkat orang tersebut otomatis keluar paling lambat sekitar 1 jam, dan sejak itu datanya tidak bisa dibuka lagi.

## Catatan
- Yang dilindungi adalah **data**. Halaman app sendiri tetap bisa dibuka siapa pun, tetapi tanpa akun yang sesuai isinya kosong dan tidak bisa mengirim atau menerima.
- Setelah aturan baru dipasang, perangkat yang belum login tidak bisa lagi mengirim atau menerima data.
