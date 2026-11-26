const jwt = require('jsonwebtoken');
const pool = require('../../database/db');
const {asyncHandler,fail}=require('../utils/helpers');
const authenticate=asyncHandler(async(req,res,next)=>{
 const header=req.headers.authorization||'';
 if(!header.startsWith('Bearer ')) fail(401,'Token Bearer diperlukan');
 let decoded;
 try {decoded=jwt.verify(header.slice(7),process.env.JWT_SECRET,{algorithms:['HS256']});}
 catch {fail(401,'Token tidak valid atau kedaluwarsa');}
 const [rows]=await pool.query('SELECT id_user,nama_lengkap,username,role,status_aktif FROM tb_user WHERE id_user=?',[decoded.id]);
 if(!rows.length||!rows[0].status_aktif) fail(401,'Akun tidak aktif / tidak ditemukan');
 req.user=rows[0];next();
});
const authorize=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():next(Object.assign(new Error('Akses ditolak untuk role ini'),{status:403}));
module.exports={authenticate,authorize};
