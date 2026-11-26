
const pool = require('../../database/db');

const {
  asyncHandler,
  fail,
  logActivity,
  positiveInt,
  requiredString
} = require('../utils/helpers');

const actions = {};

// ======================================
// 1. GET SEMUA AREA PARKIR
// ======================================

actions['get /area'] = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM tb_area_parkir ORDER BY id_area'
  );

  res.json({
    data: rows
  });
});

// ======================================
// 2. POST TAMBAH AREA PARKIR
// ======================================

actions['post /area'] = asyncHandler(async (req, res) => {
  const nama = requiredString(
    req.body.nama_area,
    'nama_area',
    50
  );

  const kapasitas = positiveInt(
    req.body.kapasitas,
    'kapasitas'
  );

  if (kapasitas > 1000) {
    fail(400, 'Kapasitas maksimal 1000 per area');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Simpan area baru
    const [result] = await conn.query(
      `INSERT INTO tb_area_parkir
       (nama_area, kapasitas, terisi)
       VALUES (?, ?, 0)`,
      [nama, kapasitas]
    );

    const idArea = result.insertId;

    // Nomor slot berdasarkan ID area yang unik
    const slots = Array.from(
      { length: kapasitas },
      (_, index) => {
        const nomorUrut = String(index + 1).padStart(3, '0');

        return [
          idArea,
          `AREA-${idArea}-${nomorUrut}`
        ];
      }
    );

    // Membuat seluruh slot parkir
    await conn.query(
      `INSERT INTO tb_slot_parkir
       (id_area, nomor_slot)
       VALUES ?`,
      [slots]
    );

    // Catat log aktivitas
    await logActivity(
      req.user.id_user,
      `Buat area #${idArea}`,
      conn
    );

    await conn.commit();

    res.status(201).json({
      message: 'Area dan slot berhasil dibuat',
      id_area: idArea,
      nama_area: nama,
      kapasitas,
      jumlah_slot: slots.length
    });

  } catch (error) {
    await conn.rollback();

    console.error('Error membuat area:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage
    });

    throw error;

  } finally {
    conn.release();
  }
});

// ======================================
// 3. GET AREA BERDASARKAN ID
// ======================================

actions['get /area/:id'] = asyncHandler(async (req, res) => {
  const id = positiveInt(req.params.id, 'id');

  const [areas] = await pool.query(
    'SELECT * FROM tb_area_parkir WHERE id_area = ?',
    [id]
  );

  if (!areas.length) {
    fail(404, 'Area tidak ditemukan');
  }

  const [slots] = await pool.query(
    `SELECT *
     FROM tb_slot_parkir
     WHERE id_area = ?
     ORDER BY id_slot`,
    [id]
  );

  res.json({
    data: areas[0],
    slots
  });
});

// ======================================
// 4. PUT UPDATE AREA PARKIR
// ======================================

actions['put /area/:id'] = asyncHandler(async (req, res) => {
  const id = positiveInt(req.params.id, 'id');

  const nama = requiredString(
    req.body.nama_area,
    'nama_area',
    50
  );

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [areas] = await conn.query(
      `SELECT *
       FROM tb_area_parkir
       WHERE id_area = ?
       FOR UPDATE`,
      [id]
    );

    if (!areas.length) {
      fail(404, 'Area tidak ditemukan');
    }

    // Kapasitas tidak boleh diubah langsung
    // untuk menjaga konsistensi data slot
    if (
      req.body.kapasitas !== undefined &&
      Number(req.body.kapasitas) !== areas[0].kapasitas
    ) {
      fail(
        409,
        'Kapasitas belum dapat diubah langsung; buat area baru agar integritas slot terjaga'
      );
    }

    await conn.query(
      `UPDATE tb_area_parkir
       SET nama_area = ?
       WHERE id_area = ?`,
      [nama, id]
    );

    await logActivity(
      req.user.id_user,
      `Ubah area #${id}`,
      conn
    );

    await conn.commit();

    res.json({
      message: 'Area berhasil diperbarui'
    });

  } catch (error) {
    await conn.rollback();
    throw error;

  } finally {
    conn.release();
  }
});

// ======================================
// 5. DELETE AREA PARKIR
// ======================================

actions['delete /area/:id'] = asyncHandler(async (req, res) => {
  const id = positiveInt(req.params.id, 'id');

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [areas] = await conn.query(
      `SELECT *
       FROM tb_area_parkir
       WHERE id_area = ?
       FOR UPDATE`,
      [id]
    );

    if (!areas.length) {
      fail(404, 'Area tidak ditemukan');
    }

    // Cegah penghapusan area yang sedang digunakan
    if (areas[0].terisi > 0) {
      fail(409, 'Masih ada kendaraan di area parkir');
    }

    // Hapus slot milik area
    await conn.query(
      'DELETE FROM tb_slot_parkir WHERE id_area = ?',
      [id]
    );

    // Hapus area parkir
    await conn.query(
      'DELETE FROM tb_area_parkir WHERE id_area = ?',
      [id]
    );

    await logActivity(
      req.user.id_user,
      `Hapus area #${id}`,
      conn
    );

    await conn.commit();

    res.json({
      message: 'Area berhasil dihapus'
    });

  } catch (error) {
    await conn.rollback();

    console.error('Error menghapus area:', {
      code: error.code,
      sqlMessage: error.sqlMessage
    });

    throw error;

  } finally {
    conn.release();
  }
});

module.exports = actions;
