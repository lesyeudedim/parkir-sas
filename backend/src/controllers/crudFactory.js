const bcrypt=require('bcryptjs');
const {fail,logActivity,positiveInt,nonNegativeInt,requiredString}=require('../utils/helpers');
const models={users:require('../models/userModel'),kendaraan:require('../models/kendaraanModel'),tarif:require('../models/tarifModel')};
const specs={
 users:{fields:['nama_lengkap','username','role','status_aktif'],required:['nama_lengkap','username','role']},
 kendaraan:{fields:['plat_nomor','jenis_kendaraan','warna','pemilik'],required:['plat_nomor','jenis_kendaraan']},
 tarif:{fields:['jenis_kendaraan','tarif_per_jam'],required:['jenis_kendaraan','tarif_per_jam']}
};
function validate(kind,input,update=false){
 const data={};const spec=specs[kind];
 for(const key of spec.fields)if(Object.prototype.hasOwnProperty.call(input,key)){
  let v=input[key];
  if(['nama_lengkap','username','plat_nomor','jenis_kendaraan'].includes(key))v=requiredString(v,key,key==='plat_nomor'?15:50);
  if(['warna','pemilik'].includes(key)&&v!==null)v=requiredString(v,key,key==='warna'?20:100);
  if(key==='status_aktif'){if(typeof v!=='boolean'&&v!==0&&v!==1)fail(400,'status_aktif harus boolean');v=Number(v)}
  if(key==='role'&&!['admin','petugas','owner'].includes(v))fail(400,'Role tidak valid');
  if(key==='jenis_kendaraan'&&!['motor','mobil','lainnya'].includes(v))fail(400,'Jenis kendaraan tidak valid');
  if(key==='tarif_per_jam')v=nonNegativeInt(v,key);
  if(key==='plat_nomor')v=v.toUpperCase();
  data[key]=v;
 }
 if(!update)for(const k of spec.required)if(data[k]===undefined)fail(400,`${k} wajib diisi`);
 if(update&&!Object.keys(data).length&&!(kind==='users'&&input.password!==undefined))fail(400,'Tidak ada data untuk diubah');
 return data;
}
module.exports=kind=>{
 const model=models[kind];
 return {
  async list(req,res){const limit=Math.min(100,positiveInt(req.query.limit||20,'limit')),offset=nonNegativeInt(req.query.offset||0,'offset');res.json({data:await model.list(limit,offset),limit,offset})},
  async get(req,res){const data=await model.find(positiveInt(req.params.id,'id'));if(!data)fail(404,'Data tidak ditemukan');res.json({data})},
  async create(req,res){const data=validate(kind,req.body);
   if(kind==='users'){data.password=await bcrypt.hash(requiredString(req.body.password,'password',72),10);data.status_aktif=data.status_aktif??1}
   if(kind==='kendaraan')data.id_user=req.user.id_user;
   const id=await model.create(data);await logActivity(req.user.id_user,`Tambah ${kind} #${id}`);res.status(201).json({message:'Data dibuat',id})
  },
  async update(req,res){const id=positiveInt(req.params.id,'id'),data=validate(kind,req.body,true);
   if(kind==='users'&&req.body.password!==undefined)data.password=await bcrypt.hash(requiredString(req.body.password,'password',72),10);
   if(kind==='users'&&id===req.user.id_user&&(data.status_aktif===0||(data.role&&data.role!=='admin')))fail(400,'Tidak bisa menonaktifkan/menurunkan role sendiri');
   if(!await model.update(id,data))fail(404,'Data tidak ditemukan');await logActivity(req.user.id_user,`Ubah ${kind} #${id}`);res.json({message:'Data diperbarui'})
  },
  async remove(req,res){const id=positiveInt(req.params.id,'id');if(kind==='users'&&id===req.user.id_user)fail(400,'Tidak bisa menghapus akun sendiri');if(!await model.remove(id))fail(404,'Data tidak ditemukan');await logActivity(req.user.id_user,`Hapus ${kind} #${id}`);res.json({message:'Data dihapus'})}
 }
};
