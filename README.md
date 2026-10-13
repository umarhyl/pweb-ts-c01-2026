# PWEB TYPESCRIPT C01 2026

## Aplikasi Antrean Rumah Sakit

Aplikasi ini dibuat dengan HTML, CSS, dan TypeScript native untuk mengelola antrean
rumah sakit. Seluruh sesi login, jenis layanan, dan tiket antrean disimpan pada
Local Storage.

## Menjalankan proyek

```bash
npm install
npm run build
```

Setelah kompilasi selesai, buka `beranda.html` menggunakan Live Server. Untuk
kompilasi otomatis saat mengembangkan fitur, gunakan:

```bash
npm run watch
```

Semua halaman aplikasi memerlukan login. Admin/moderator diarahkan ke dashboard
admin, sedangkan user diarahkan ke halaman ambil antrean. Halaman operator hanya
dapat digunakan admin/moderator.

## Alur halaman

- Admin/moderator: `login.html` -> `index.html` -> `operator.html`
- User: `login.html` -> `ambil-antrian.html` -> `layar.html`

Autentikasi menggunakan endpoint `https://dummyjson.com/auth/login`.

Anggota Kelompok:

| Nama                   | NRP        |
| ---------------------- | ---------- |
| Umar                   | 5027251005 |
| Keisya Halimah Mulia   | 5027251068 |
| Kaisar Hanif Pratama   | 5027241029 |
