/* Pengaturan bersama untuk app Permintaan dan app Gudang.
   Isi dbUrl dengan alamat Firebase Realtime Database (lihat FIREBASE.md).
   Contoh: 'https://pm-packaging-12345-default-rtdb.asia-southeast1.firebasedatabase.app'
   Kosongkan jika belum dipakai: tombol "Kirim ke Gudang" lalu memakai file. */
/* apiKey: Web API Key Firebase (Project settings > General). Jika diisi, akses memakai login akun (lihat FIREBASE.md). Kosongkan untuk memakai PIN di pin.js. */
/* jalur: nama folder data bersama untuk kedua app (tetap, tanpa input kode). Minimal 10 huruf/angka. */
window.PMG_CONFIG = { dbUrl: '', apiKey: '', jalur: 'pmpackaging2026' };
