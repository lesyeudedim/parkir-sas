require('dotenv').config();const bcrypt=require('bcryptjs');const pool=require('../database/db');
(async()=>{const username=process.env.ADMIN_USERNAME||'admin';const password=process.env.ADMIN_PASSWORD;
 if(!password||password.length<10)throw new Error('ADMIN_PASSWORD minimal 10 karakter di .env');
 const [existing]=await pool.query('SELECT id_user FROM tb_user WHERE username=?',[username]);
 if(existing.length){console.log('Admin sudah ada; seed dilewati');return;}
 const hash=await bcrypt.hash(password,10);
 await pool.query('INSERT INTO tb_user (nama_lengkap,username,password,role,status_aktif) VALUES (?,?,?,?,1)',[
 process.env.ADMIN_NAME||'Administrator',username,hash,'admin']);console.log('Admin berhasil dibuat:',username);
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>pool.end());
