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

## 5. Pasang kode gudang
1. App **Permintaan** → Pengaturan → **Kode gudang** → ketuk **🎲 Buat kode acak**. Catat kodenya.
2. App **Gudang** → tab **Impor** → isi **Kode gudang** dengan kode yang sama → **Simpan kode**.
3. Selesai. Tombol **📦 Kirim ke Gudang** sekarang langsung mengirim; permintaan muncul sendiri di tab **Masuk** gudang.

## Catatan
- Kode adalah kunci akses. Jangan dibagikan ke orang di luar tim. Jika bocor, buat kode baru dan masukkan ulang di kedua app.
- Permintaan yang dikirim ulang (nomor sama) memperbarui jumlah item di gudang, selama penerimaannya belum selesai.
- Data lebih dari 30 hari dibersihkan otomatis oleh app gudang.
- Jika internet mati saat menekan tombol, app memakai cara file (menu bagikan / unduh) sebagai cadangan.
- Notifikasi saat app gudang tertutup belum ada. Permintaan masuk begitu app gudang dibuka lagi.
- **Kirim ke Lokasi:** di app gudang, setelah penerimaan selesai dan semua item Sesuai, muncul kartu untuk mengisi lokasi dan 1-4 foto. Di app permintaan, hasilnya ada di Beranda → **Sudah Dikirim**. Foto dikompres otomatis (sekitar 300 KB per foto). Jika internet mati, pengiriman diantre dan terkirim sendiri saat tersambung.

---

# Login akun: PM Permintaan hanya untuk packing, PM Gudang hanya untuk gudang

Setelah langkah ini, data di database (permintaan, info pengiriman, foto) hanya bisa dibuka oleh akun yang terdaftar. Kode gudang tetap dipakai seperti biasa. Sebelum `apiKey` diisi, app memakai PIN dari `pin.js`.

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
   Tips: tidak perlu email asli. Pakai bentuk `nama@pm-packaging.local` (mis. `budi@pm-packaging.local`). Di halaman depan orang cukup mengetik **budi** (tanpa `@...`).
2. Salin **User UID** akun itu.
3. **Realtime Database → Data**: tambahkan node `roles`, di dalamnya kunci = UID tadi, nilai = salah satu:
   - `packing` → hanya PM Permintaan
   - `gudang` → hanya PM Gudang
   - `semua` → keduanya (untuk admin)
   (nilai berupa teks, contoh: `packing`)

## Mencabut akses
Hapus node `roles/UID` atau nonaktifkan akun di Authentication. Perangkat orang tersebut otomatis keluar paling lambat sekitar 1 jam, dan sejak itu datanya tidak bisa dibuka lagi.

## Catatan
- Yang dilindungi adalah **data**. Halaman app sendiri tetap bisa dibuka siapa pun, tetapi tanpa akun yang sesuai isinya kosong dan tidak bisa mengirim atau menerima.
- Setelah aturan baru dipasang, perangkat yang belum login tidak bisa lagi mengirim atau menerima data.
