# Backend Aplikasi Parkir – P2-SPK (MVC, struktur revisi)

Backend memakai JavaScript, Express, dan MySQL melalui XAMPP.

## Letak file
- `db.js` di akar proyek: koneksi MySQL.
- `app.js` di akar proyek: konfigurasi Express, middleware, rute API, error handler.
- `server.js` di akar proyek: menjalankan server.
- `src/models`, `src/controllers`, `src/routes`: modul MVC.
- Database `.sql` **tidak disimpan dalam proyek**. Dalam ZIP ada folder `SQL_Untuk_Import_XAMPP/parkir.sql` di samping folder backend; ini hanya file impor SQL.

## Cara instalasi
1. Ekstrak ZIP.
2. Impor `SQL_Untuk_Import_XAMPP/parkir.sql` menggunakan phpMyAdmin (jangan langsung memasukkan `.sql` ke `xampp/mysql/data`). Bila sudah ada DB parkir, backup dulu dan hindari impor ulang yang menimpa data.
3. Boleh salin file SQL ke `C:\xampp\sql-backup\parkir.sql`, tetapi lokasi penyimpanan file SQL tidak mempengaruhi koneksi Node.js ke database.
4. Buka folder `Aplikasi_Parkir_Backend` di VS Code.
5. Jalankan `npm install`.
6. Salin `.env.example` ke `.env`, konfigurasi DB_NAME=parkir, DB_USER, DB_PASSWORD, dan JWT_SECRET yang kuat.
7. Jalankan `npm run seed:admin`, kemudian `npm run dev`.
8. Tes `http://localhost:3000/api/health` dan `tests/pengujian.http` menggunakan REST Client.

## Endpoint
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`: semua pengguna.
- `/api/users`, `/api/tarif`, `/api/kendaraan`, `/api/area`: CRUD Admin.
- `GET /api/logs`: Admin.
- `GET /api/parkir/slot-kosong?id_area=1`, `POST /api/parkir/masuk`, `GET /api/parkir/cek-keluar/:nomor`, `POST /api/parkir/keluar`, `GET /api/parkir/struk/:nomor`: Petugas.
- `GET /api/laporan/rekap?mulai=2026-11-01&sampai=2026-11-30`: Owner.

Simulasi palang dan cetak struk berupa respons API, bukan kendali hardware atau printer fisik. Pengujian sintaks dilakukan, pengujian database tetap perlu dilakukan di komputer pengguna.
