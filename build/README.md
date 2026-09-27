# Panduan Mengganti Icon & Asset Aplikasi (.exe & Installer)

Jika Anda sudah memiliki logo atau icon untuk aplikasi:

1. **Format File Icon**: Siapkan gambar icon dengan format `.ico` (resolusi disarankan 256x256 pixel). Anda bisa menggunakan tool online gratis seperti *convertico.com* atau sejenisnya untuk mengubah file `.png` menjadi `.ico`.
2. **Nama File**: Simpan dengan nama `icon.ico` di dalam folder ini (`build/icon.ico`).
3. **Build Ulang**: Jalankan perintah `npm run electron:build` di terminal.
4. **Hasil**: File `.exe` dan installer di folder `release/` akan otomatis menggunakan logo baru Anda.
