# PWEB TYPESCRIPT C01 2026

Anggota Kelompok:

| Nama                   | NRP        |
| ---------------------- | ---------- |
| Umar                   | 5027251005 |
| Keisya Halimah Mulia   | 5027251068 |
| Kaisar Hanif Pratama   | 5027241029 |

## Menjalankan proyek

Di terminal PowerShell yang berada di folder ini:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
py -m http.server 5173
```

Saat mengembangkan, jalankan `npm.cmd run watch` di terminal terpisah agar perubahan `.ts` langsung dikompilasi. Jalankan `npm.cmd run test` untuk memeriksa alur antrean. `node_modules/` hanya berisi TypeScript compiler yang dipasang lewat npm, diabaikan oleh `.gitignore`, dan dapat dibuat ulang dengan `npm.cmd ci`.

Buka `http://localhost:5173/beranda.html` untuk beranda publik, atau `http://localhost:5173/` untuk dashboard yang akan meminta login. Live Server juga bisa dipakai. **Seluruh halaman harus dibuka dengan browser, host, dan port yang sama** agar `localStorage` terbaca bersama; contoh: semua memakai `http://localhost:5173`, bukan sebagian `file://` atau port lain.

## Alur halaman

- `beranda.html`: beranda publik dengan pilihan ambil nomor, lihat layar, dan masuk petugas. Jika sesi masih ada, tombol petugas kembali ke panel tanpa login ulang.
- `index.html`: Dashboard Admin; hanya role `admin` atau `moderator` yang sudah login. Wallpaper dashboard dan halaman publik (Beranda, Ambil Nomor, dan Layar Antrean) memakai foto latar buram; login memakai latar putih. Taskbar dashboard menyediakan pintasan cepat ke Dashboard Admin serta Beranda Publik.
- `ambil-antrian.html`: pasien memilih poli aktif, melihat estimasi sesuai antrean poli, lalu mendapatkan tiket yang dapat dicetak atau disimpan sebagai PDF.
- `layar.html`: layar publik yang memperbarui nomor dipanggil.
- `login.html`: masuk dengan akun DummyJSON. Role `admin` dan `moderator` diarahkan ke `index.html`; role `user` ke `operator.html`.
- `operator.html`: semua pengguna yang login bisa membuka panel operator. Panggil berikutnya menurut VIP → Disabilitas → Lansia → Normal, panggil ulang, lewati, selesaikan, serta kembalikan tiket yang sempat dilewati.
- Dashboard menyediakan tiket manual, CRUD jenis antrean, reset, statistik, peringatan antrean ≥5 orang per poli, dan CSV.

Jam pada data lama tidak membatasi demo. Tiket dapat diambil kapan saja selama layanan **aktif**. Admin memakai tombol **Aktifkan/Nonaktifkan** untuk mengizinkan atau menutup pengambilan tiket baru. Tombol **Ubah** mengganti nama layanan dan rata-rata waktu pelayanan. Layanan yang nonaktif tetap menyimpan tiket lama, tetapi tidak tersedia di formulir pasien maupun tiket manual.
Data layanan versi awal yang memakai kunci `jenisAntrian` dan properti `isActive` tetap dibaca saat `queueTypes` belum ada.

Contoh dari data DummyJSON: `emilys` berperan `admin`, `oliviaw` berperan `moderator`, dan `averyp` berperan `user`. Password uji tersedia pada data pengguna DummyJSON. Sesuai soal, admin dan moderator memiliki akses Dashboard Admin; operator hanya mensyaratkan sudah login, sehingga admin/moderator juga dapat membuka panel operator. Halaman publik tidak memerlukan login. Respons login bisa tidak menyertakan `role`; aplikasi mengambil role dari data pengguna berdasarkan ID yang dikembalikan API.

Saat **Lewati** ditekan, tiket menjadi `skipped` dan tidak ikut urutan panggilan. Jika pasien datang kembali, petugas menekan **Kembalikan ke Antrean**; tiket kembali menunggu dengan nomor yang sama dan ditempatkan menurut prioritas dan waktu masuk kembalinya.

Kode TypeScript ada di `ts/`, hasil kompilasi ada di `js/`. Semua data antrean disimpan di `localStorage` dengan kunci `queueTypes` dan `queueTickets`; halaman pada browser dan origin yang sama membaca data tersebut. Folder `js/` disimpan di Git agar situs statis langsung dapat dibuka setelah di-host.

## Batasan prototipe

Guard mengikuti ketentuan praktikum dengan mengecek token, nama, dan role di `localStorage`. Tindakan antrean juga memakai `localStorage`. Pengguna yang mengubah penyimpanan browser dapat memanipulasi data; data tidak tersinkron antarperangkat atau antarbrowser. Untuk rumah sakit sungguhan, semua pembacaan/penulisan tiket, otorisasi peran, dan sinkronisasi harus dipindahkan ke backend serta database. Jangan simpan data pribadi pasien pada prototipe ini.

Peringatan hampir dipanggil tampil pada tiket pasien selama halaman itu masih terbuka. Suara panggilan dapat diuji dari panel operator, atau diaktifkan pada layar antrean agar pembaruan panggilan dibacakan di perangkat layar. Perkiraan waktu tunggu dihitung dari jumlah antrean di depan pada poli yang dipilih menurut urutan prioritas × rata-rata menit pelayanan yang diatur admin; hasilnya perkiraan, bukan janji waktu.

Font `W95FA` dipakai bila tersedia di perangkat; jika belum terpasang, tampilan memakai Trebuchet MS/Arial. Tema memakai warna biru `#003399`/`#0050ee`, krem `#ece9d8`, dan biru muda `#d2ecff` dari acuan desain kelompok.
