
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../../database/db');

// Middleware dan helper
const { authenticate } = require('../middleware/auth');
const {
  asyncHandler,
  fail,
  requiredString,
  logActivity
} = require('../utils/helpers');

const actions = {};

// ==============================
// LOGIN USER
// ==============================
actions['post /login'] = asyncHandler(async (req, res) => {
  const username = requiredString(
    req.body.username,
    'username',
    50
  );

  const password = requiredString(
    req.body.password,
    'password',
    100
  );

  // Cari user berdasarkan username
  const [rows] = await pool.query(
    'SELECT * FROM tb_user WHERE username = ?',
    [username]
  );

  const user = rows[0];

  // Validasi username dan password
  if (
    !user ||
    !user.status_aktif ||
    !(await bcrypt.compare(password, user.password))
  ) {
    fail(401, 'Username atau password salah');
  }

  // Membuat token JWT
  const token = jwt.sign(
    { id: user.id_user },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    }
  );

  // Simpan log aktivitas login
  await logActivity(user.id_user, 'Login');

  res.json({
    message: 'Login berhasil',
    token,
    user: {
      id_user: user.id_user,
      nama_lengkap: user.nama_lengkap,
      username: user.username,
      role: user.role
    }
  });
});

// ==============================
// PROFIL USER
// ==============================
actions['get /me'] = (req, res) => {
  res.json({
    user: req.user
  });
};

// ==============================
// LOGOUT USER
// ==============================
actions['post /logout'] = asyncHandler(async (req, res) => {
  await logActivity(req.user.id_user, 'Logout');

  res.json({
    message: 'Logout berhasil dicatat. Hapus token pada client.'
  });
});

module.exports = actions;
