const pool = require('../../database/db');

const {
  asyncHandler,
  fail,
  positiveInt,
  requiredString,
  logActivity
} = require('../utils/helpers');

const actions = {};

// ==========================================
// QUERY DATA TRANSAKSI DAN KARCIS
// ==========================================

const lookupSQL = `
  SELECT
    t.*,
    k.plat_nomor,
    k.jenis_kendaraan,
    k.warna,
    s.nomor_slot,
    a.nama_area,
    tf.tarif_per_jam,
    GREATEST(
      0,
      TIMESTAMPDIFF(MINUTE, t.waktu_masuk, NOW())
    ) AS menit_parkir
  FROM tb_transaksi t
  JOIN tb_kendaraan k
    ON t.id_kendaraan = k.id_kendaraan
  JOIN tb_slot_parkir s
    ON t.id_slot = s.id_slot
  JOIN tb_area_parkir a
    ON t.id_area = a.id_area
  JOIN tb_tarif tf
    ON t.id_tarif = tf.id_tarif
  WHERE t.nomor_karcis = ?
`;

// ==========================================
// 1. MELIHAT SLOT PARKIR KOSONG
// ==========================================

actions['get /slot-kosong'] = asyncHandler(
  async (req, res) => {
    const idArea = positiveInt(
      req.query.id_area,
      'id_area'
    );

    const [slots] = await pool.query(
      `SELECT id_slot, id_area, nomor_slot
       FROM tb_slot_parkir
       WHERE id_area = ?
       AND status_slot = 'kosong'
       ORDER BY nomor_slot`,
      [idArea]
    );

    res.json({
      data: slots
    });
  }
);

// ==========================================
// 2. TRANSAKSI PARKIR MASUK
// ==========================================

actions['post /masuk'] = asyncHandler(
  async (req, res) => {

    // Semua data kendaraan wajib diisi
    const plat = requiredString(
      req.body.plat_nomor,
      'plat_nomor',
      15
    ).toUpperCase();

    const jenis = requiredString(
      req.body.jenis_kendaraan,
      'jenis_kendaraan',
      20
    ).toLowerCase();

    const warna = requiredString(
      req.body.warna,
      'warna',
      30
    );

    const areaId = positiveInt(
      req.body.id_area,
      'id_area'
    );

    const slotId = positiveInt(
      req.body.id_slot,
      'id_slot'
    );

    // Hanya motor dan mobil
    if (!['motor', 'mobil'].includes(jenis)) {
      fail(
        400,
        'Jenis kendaraan hanya boleh motor atau mobil'
      );
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Cari area dari slot yang dipilih
      const [slotLookup] = await conn.query(
        `SELECT id_area
         FROM tb_slot_parkir
         WHERE id_slot = ?`,
        [slotId]
      );

      if (!slotLookup.length) {
        fail(404, 'Slot parkir tidak ditemukan');
      }

      // Pastikan slot sesuai area
      if (Number(slotLookup[0].id_area) !== areaId) {
        fail(400, 'Slot tidak sesuai dengan area parkir');
      }

      // Kunci area agar tidak terjadi overbooking
      const [areas] = await conn.query(
        `SELECT *
         FROM tb_area_parkir
         WHERE id_area = ?
         FOR UPDATE`,
        [areaId]
      );

      if (!areas.length) {
        fail(404, 'Area parkir tidak ditemukan');
      }

      // Kunci slot terpilih
      const [slots] = await conn.query(
        `SELECT *
         FROM tb_slot_parkir
         WHERE id_slot = ?
         FOR UPDATE`,
        [slotId]
      );

      if (
        !slots.length ||
        slots[0].status_slot !== 'kosong' ||
        Number(areas[0].terisi) >= Number(areas[0].kapasitas)
      ) {
        fail(409, 'Tempat parkir sudah terisi atau penuh');
      }

      // Ambil tarif kendaraan
      const [tarif] = await conn.query(
        `SELECT id_tarif
         FROM tb_tarif
         WHERE jenis_kendaraan = ?`,
        [jenis]
      );

      if (!tarif.length) {
        fail(400, 'Tarif kendaraan belum tersedia');
      }

      // Cari kendaraan berdasarkan plat nomor
      const [kendaraan] = await conn.query(
        `SELECT *
         FROM tb_kendaraan
         WHERE plat_nomor = ?
         FOR UPDATE`,
        [plat]
      );

      let idKendaraan;

      if (kendaraan.length) {
        idKendaraan = kendaraan[0].id_kendaraan;

        if (kendaraan[0].jenis_kendaraan !== jenis) {
          fail(
            409,
            'Plat nomor terdaftar dengan jenis kendaraan berbeda'
          );
        }

        // Periksa apakah kendaraan masih parkir
        const [aktif] = await conn.query(
          `SELECT id_parkir
           FROM tb_transaksi
           WHERE id_kendaraan = ?
           AND status = 'masuk'
           LIMIT 1`,
          [idKendaraan]
        );

        if (aktif.length) {
          fail(
            409,
            'Kendaraan masih berada di area parkir'
          );
        }

        // Perbarui warna kendaraan
        await conn.query(
          `UPDATE tb_kendaraan
           SET warna = ?
           WHERE id_kendaraan = ?`,
          [warna, idKendaraan]
        );

      } else {

        // Simpan kendaraan baru
        const [result] = await conn.query(
          `INSERT INTO tb_kendaraan
           (plat_nomor, jenis_kendaraan, warna, id_user)
           VALUES (?, ?, ?, ?)`,
          [
            plat,
            jenis,
            warna,
            req.user.id_user
          ]
        );

        idKendaraan = result.insertId;
      }

      // Simpan transaksi masuk
      const [result] = await conn.query(
        `INSERT INTO tb_transaksi
         (
           id_kendaraan,
           id_tarif,
           id_user,
           id_area,
           id_slot,
           status
         )
         VALUES (?, ?, ?, ?, ?, 'masuk')`,
        [
          idKendaraan,
          tarif[0].id_tarif,
          req.user.id_user,
          areaId,
          slotId
        ]
      );

      // Buat nomor karcis otomatis
      const nomorKarcis =
        `PK-${String(result.insertId).padStart(8, '0')}`;

      await conn.query(
        `UPDATE tb_transaksi
         SET nomor_karcis = ?
         WHERE id_parkir = ?`,
        [nomorKarcis, result.insertId]
      );

      // Ubah slot menjadi terisi
      await conn.query(
        `UPDATE tb_slot_parkir
         SET status_slot = 'terisi'
         WHERE id_slot = ?`,
        [slotId]
      );

      // Tambah jumlah kendaraan terisi
      await conn.query(
        `UPDATE tb_area_parkir
         SET terisi = terisi + 1
         WHERE id_area = ?`,
        [areaId]
      );

      await logActivity(
        req.user.id_user,
        `Parkir masuk ${nomorKarcis}`,
        conn
      );

      await conn.commit();

      res.status(201).json({
        message: 'Karcis berhasil diterbitkan',
        karcis: {
          nomor_karcis: nomorKarcis,
          plat_nomor: plat,
          jenis_kendaraan: jenis,
          warna: warna,
          id_area: areaId,
          id_slot: slotId,
          nomor_slot: slots[0].nomor_slot
        },
        palang_masuk: 'BUKA (simulasi API)'
      });

    } catch (error) {
      await conn.rollback();
      throw error;

    } finally {
      conn.release();
    }
  }
);

// ==========================================
// 3. CEK BIAYA PARKIR SAAT KELUAR
// ==========================================

actions['get /cek-keluar/:nomor'] = asyncHandler(
  async (req, res) => {

    const nomor = requiredString(
      req.params.nomor,
      'nomor karcis',
      40
    );

    const [rows] = await pool.query(
      lookupSQL,
      [nomor]
    );

    if (!rows.length) {
      fail(404, 'Nomor karcis tidak ditemukan');
    }

    const transaksi = rows[0];

    if (transaksi.status === 'keluar') {
      fail(409, 'Karcis sudah digunakan');
    }

    // Pembulatan durasi minimal 1 jam
    const durasiJam = Math.max(
      1,
      Math.ceil(transaksi.menit_parkir / 60)
    );

    const totalBayar =
      durasiJam * Number(transaksi.tarif_per_jam);

    res.json({
      data: {
        nomor_karcis: nomor,
        plat_nomor: transaksi.plat_nomor,
        jenis_kendaraan: transaksi.jenis_kendaraan,
        warna: transaksi.warna,
        nomor_slot: transaksi.nomor_slot,
        nama_area: transaksi.nama_area,
        waktu_masuk: transaksi.waktu_masuk,
        durasi_jam: durasiJam,
        tarif_per_jam: transaksi.tarif_per_jam,
        total_bayar: totalBayar
      }
    });
  }
);

// ==========================================
// 4. TRANSAKSI PARKIR KELUAR
// ==========================================

actions['post /keluar'] = asyncHandler(
  async (req, res) => {

    const nomor = requiredString(
      req.body.nomor_karcis,
      'nomor_karcis',
      40
    );

    const metode = requiredString(
      req.body.metode_pembayaran || 'tunai',
      'metode_pembayaran',
      20
    ).toLowerCase();

    if (!['tunai', 'transfer', 'qris'].includes(metode)) {
      fail(400, 'Metode pembayaran tidak didukung');
    }

    if (req.body.konfirmasi_bayar !== true) {
      fail(400, 'Pembayaran belum dikonfirmasi');
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [idRow] = await conn.query(
        `SELECT id_parkir, id_area
         FROM tb_transaksi
         WHERE nomor_karcis = ?`,
        [nomor]
      );

      if (!idRow.length) {
        fail(404, 'Nomor karcis tidak ditemukan');
      }

      // Kunci area
      const [areas] = await conn.query(
        `SELECT id_area
         FROM tb_area_parkir
         WHERE id_area = ?
         FOR UPDATE`,
        [idRow[0].id_area]
      );

      if (!areas.length) {
        fail(404, 'Area parkir tidak ditemukan');
      }

      // Kunci transaksi
      const [rows] = await conn.query(
        `SELECT *
         FROM tb_transaksi
         WHERE id_parkir = ?
         FOR UPDATE`,
        [idRow[0].id_parkir]
      );

      const transaksi = rows[0];

      if (transaksi.status !== 'masuk') {
        fail(409, 'Transaksi sudah selesai');
      }

      // Ambil tarif
      const [tarif] = await conn.query(
        `SELECT tarif_per_jam
         FROM tb_tarif
         WHERE id_tarif = ?`,
        [transaksi.id_tarif]
      );

      if (!tarif.length) {
        fail(404, 'Tarif transaksi tidak ditemukan');
      }

      // Hitung durasi dari waktu masuk
      const [elapsed] = await conn.query(
        `SELECT
         GREATEST(
           0,
           TIMESTAMPDIFF(MINUTE, waktu_masuk, NOW())
         ) AS menit
         FROM tb_transaksi
         WHERE id_parkir = ?`,
        [transaksi.id_parkir]
      );

      const durasiJam = Math.max(
        1,
        Math.ceil(elapsed[0].menit / 60)
      );

      const totalBayar =
        durasiJam * Number(tarif[0].tarif_per_jam);

      if (!Number.isSafeInteger(totalBayar)) {
        fail(409, 'Jumlah pembayaran tidak valid');
      }

      // Simpan transaksi keluar
      await conn.query(
        `UPDATE tb_transaksi
         SET
           waktu_keluar = NOW(),
           durasi_jam = ?,
           biaya_total = ?,
           status = 'keluar',
           metode_pembayaran = ?,
           user_keluar = ?
         WHERE id_parkir = ?`,
        [
          durasiJam,
          totalBayar,
          metode,
          req.user.id_user,
          transaksi.id_parkir
        ]
      );

      // Kosongkan slot
      await conn.query(
        `UPDATE tb_slot_parkir
         SET status_slot = 'kosong'
         WHERE id_slot = ?`,
        [transaksi.id_slot]
      );

      // Kurangi jumlah terisi
      await conn.query(
        `UPDATE tb_area_parkir
         SET terisi = terisi - 1
         WHERE id_area = ?
         AND terisi > 0`,
        [transaksi.id_area]
      );

      await logActivity(
        req.user.id_user,
        `Parkir keluar ${nomor}`,
        conn
      );

      await conn.commit();

      res.json({
        message: 'Pembayaran berhasil dikonfirmasi',
        struk: {
          nomor_karcis: nomor,
          durasi_jam: durasiJam,
          total_bayar: totalBayar,
          metode_pembayaran: metode
        },
        palang_keluar: 'BUKA (simulasi API)'
      });

    } catch (error) {
      await conn.rollback();
      throw error;

    } finally {
      conn.release();
    }
  }
);

// ==========================================
// 5. CETAK / LIHAT DATA STRUK PARKIR
// ==========================================

actions['get /struk/:nomor'] = asyncHandler(
  async (req, res) => {

    const nomor = requiredString(
      req.params.nomor,
      'nomor karcis',
      40
    );

    const [rows] = await pool.query(
      lookupSQL,
      [nomor]
    );

    if (!rows.length) {
      fail(404, 'Karcis tidak ditemukan');
    }

    const transaksi = rows[0];

    if (transaksi.status !== 'keluar') {
      fail(409, 'Transaksi parkir belum selesai');
    }

    res.json({
      struk: {
        nomor_karcis: nomor,
        plat_nomor: transaksi.plat_nomor,
        jenis_kendaraan: transaksi.jenis_kendaraan,
        warna: transaksi.warna,
        nomor_slot: transaksi.nomor_slot,
        area: transaksi.nama_area,
        waktu_masuk: transaksi.waktu_masuk,
        waktu_keluar: transaksi.waktu_keluar,
        durasi_jam: transaksi.durasi_jam,
        total_bayar: transaksi.biaya_total,
        metode_pembayaran:
          transaksi.metode_pembayaran,
        status: transaksi.status
      }
    });
  }
);

module.exports = actions;
