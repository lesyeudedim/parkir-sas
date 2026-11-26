# Frontend Sistem Informasi Parkir

Frontend mandiri HTML/CSS/JavaScript ES modules. Tidak menyertakan atau mengubah backend. Node.js hanya menyajikan file frontend pada port 5173; tidak ada dependency eksternal.

## Menjalankan di Windows
1. Instal Node.js LTS dan VS Code.
2. Ekstrak ZIP, buka folder `frontend-parkir` di VS Code.
3. Buka Terminal, jalankan `npm.cmd run dev`.
4. Buka http://localhost:5173 di browser.
5. Pilih Simulasi mandiri. Akun demo: `admin`, `petugas1`, `owner1`; semua password `demo123`. Ini bukan akun backend asli.

## Uji simulasi
- Admin: lihat/tambah/edit/hapus data master, lihat log.
- Petugas: parkir masuk (plat, jenis, warna, area, slot), salin nomor karcis, cek keluar, konfirmasi pembayaran, cetak struk.
- Owner: pilih tanggal hari ini, tampilkan rekap transaksi yang sudah keluar.
- Data demo tersimpan di localStorage browser. Untuk reset, hapus key `parkir-demo-v1` melalui DevTools > Application > Local Storage. Jangan gunakan data asli dalam mode demo.

## Integrasi backend
Jalankan backend dan MySQL sesuai petunjuk proyek backend. Pastikan CORS mengizinkan http://localhost:5173. Pada login pilih Backend asli, URL `http://localhost:3000/api`, gunakan akun asli. Token disimpan di sessionStorage, dikirim sebagai Bearer. Jangan commit token atau password asli.

Kontrak yang diketahui: POST /auth/login, POST /auth/logout, GET /parkir/slot-kosong?id_area=..., POST /parkir/masuk, GET /parkir/cek-keluar/:nomor, POST /parkir/keluar, GET /parkir/struk/:nomor, GET /laporan/rekap?mulai=...&sampai=.... CRUD diasumsikan GET/POST /users, /tarif, /area, /kendaraan dan PUT/DELETE /resource/:id. Nama field user `nama`, role, bentuk daftar, hak akses area petugas, dan format rekap perlu diverifikasi dengan pengujian.http/routes asli. Ubah adapter src/api.js dan pemetaan laporan src/app.js jika berbeda. Mock tidak menjamin aturan backend persis. Tidak ada endpoint CRUD slot terpisah yang terkonfirmasi; slot dipilih saat masuk. QRIS/transfer hanya pencatatan metode, bukan payment gateway. Cetak menggunakan browser.

## GitHub setelah kedua bagian selesai
Gunakan repository bersama. Letakkan proyek ini dalam folder frontend/ dan proyek backend dalam backend/. Pada clone repo yang sudah memuat backend, buat branch `frontend` (`git switch -c frontend`), salin isi folder ini ke frontend/, lalu dari root repo jalankan `git add frontend`, `git commit -m "Tambah frontend sistem parkir"`, `git push -u origin frontend`. Buat Pull Request ke main dan review sebelum merge. Jangan menimpa backend. Jalankan masing-masing server dari foldernya dan uji login/CRUD/masuk/keluar/laporan bersama. Jangan commit .env, node_modules, atau data sensitif.
