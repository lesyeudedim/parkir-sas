const pool=require('../../database/db');
// Identifier SQL hanya berasal dari spesifikasi statis, bukan input HTTP.
module.exports=(spec)=>({
  async list(limit,offset){const [rows]=await pool.query(`SELECT ${spec.select} FROM ${spec.table} ORDER BY ${spec.pk} DESC LIMIT ? OFFSET ?`,[limit,offset]);return rows},
  async find(id){const [rows]=await pool.query(`SELECT ${spec.select} FROM ${spec.table} WHERE ${spec.pk}=?`,[id]);return rows[0]},
  async create(data){const cols=Object.keys(data);const [r]=await pool.query(`INSERT INTO ${spec.table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`,cols.map(k=>data[k]));return r.insertId},
  async update(id,data){const cols=Object.keys(data);const [r]=await pool.query(`UPDATE ${spec.table} SET ${cols.map(k=>k+'=?').join(',')} WHERE ${spec.pk}=?`,[...cols.map(k=>data[k]),id]);return r.affectedRows},
  async remove(id){const [r]=await pool.query(`DELETE FROM ${spec.table} WHERE ${spec.pk}=?`,[id]);return r.affectedRows}
});
