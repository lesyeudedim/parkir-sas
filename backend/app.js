
const express = require('express');
const cors = require('cors');

// Koneksi database MySQL
const pool = require('./database/db');

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.disable('x-powered-by');

app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')
}));

app.use(express.json({ limit: '100kb' }));

// ===============================
// CEK KONEKSI BACKEND & DATABASE
// ===============================
app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      database: 'connected',
      message: 'Backend dan database MySQL berhasil terhubung'
    });
  } catch (err) {
    next(err);
  }
});

// ===============================
// ROUTES APLIKASI PARKIR
// ===============================

// Autentikasi Admin, Petugas, Owner
app.use('/api/auth', require('./src/routes/authRoutes'));

// CRUD User
app.use('/api/users', require('./src/routes/userRoutes'));

// CRUD Tarif Parkir
app.use('/api/tarif', require('./src/routes/tarifRoutes'));

// CRUD Kendaraan
app.use('/api/kendaraan', require('./src/routes/kendaraanRoutes'));

// CRUD Area Parkir
app.use('/api/area', require('./src/routes/areaRoutes'));

// Log Aktivitas
app.use('/api/logs', require('./src/routes/logsRoutes'));

// Transaksi Parkir Masuk dan Keluar
app.use('/api/parkir', require('./src/routes/transaksiRoutes'));

// Rekap Laporan Owner
app.use('/api/laporan', require('./src/routes/laporanRoutes'));

// ===============================
// ENDPOINT TIDAK DITEMUKAN
// ===============================
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint tidak ditemukan'
  });
});

// ===============================
// ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: 'Data sudah ada (duplikat)'
    });
  }

  if (
    ['ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED']
      .includes(err.code)
  ) {
    return res.status(409).json({
      message: 'Data sudah digunakan transaksi, tidak dapat dihapus'
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      message: 'Referensi data tidak ditemukan'
    });
  }

  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      message: 'JSON tidak valid'
    });
  }

  const status = err.status || 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    message: status >= 500
      ? 'Terjadi kesalahan server'
      : err.message
  });
});

module.exports = app;
