
const pool=require('../../database/db');const {authenticate,authorize}=require('../middleware/auth');
const {asyncHandler,fail,positiveInt}=require('../utils/helpers');
function parseDate(s,label){if(typeof s!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(s))fail(400,`${label} harus YYYY-MM-DD`);const d=new Date(`${s}T00:00:00Z`);if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)fail(400,`Tanggal ${label} tidak valid`);return s;}

const actions={};
actions['get /rekap']=asyncHandler(async(req,res)=>{
 const awal=parseDate(req.query.mulai,'mulai'),akhir=parseDate(req.query.sampai,'sampai');
 if(awal>akhir)fail(400,'Tanggal mulai harus <= sampai');
 const params=[awal,akhir];
 const [summary]=await pool.query(`SELECT COUNT(*) AS jumlah_transaksi,COALESCE(SUM(biaya_total),0) AS total_pendapatan,
 COALESCE(SUM(CASE WHEN k.jenis_kendaraan='motor' THEN 1 ELSE 0 END),0) AS jumlah_motor,
 COALESCE(SUM(CASE WHEN k.jenis_kendaraan='mobil' THEN 1 ELSE 0 END),0) AS jumlah_mobil
 FROM tb_transaksi t JOIN tb_kendaraan k ON k.id_kendaraan=t.id_kendaraan
 WHERE t.status='keluar' AND DATE(t.waktu_keluar) BETWEEN ? AND ?`,params);
 const limit=Math.min(100,positiveInt(req.query.limit||50,'limit'));
 const [detail]=await pool.query(`SELECT t.nomor_karcis,k.plat_nomor,k.jenis_kendaraan,a.nama_area,t.waktu_masuk,t.waktu_keluar,t.durasi_jam,t.biaya_total
 FROM tb_transaksi t JOIN tb_kendaraan k ON k.id_kendaraan=t.id_kendaraan JOIN tb_area_parkir a ON a.id_area=t.id_area
 WHERE t.status='keluar' AND DATE(t.waktu_keluar) BETWEEN ? AND ? ORDER BY t.waktu_keluar DESC LIMIT ?`,[...params,limit]);
 res.json({periode:{mulai:awal,sampai:akhir},ringkasan:summary[0],detail});
});
module.exports=actions;
