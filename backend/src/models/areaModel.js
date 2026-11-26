const pool=require('../../database/db');
const table='tb_area_parkir';
module.exports={table,async find(id){const [r]=await pool.query('SELECT * FROM '+table+' WHERE id_area=?',[id]);return r[0]},async list(limit=50){const [r]=await pool.query('SELECT * FROM '+table+' ORDER BY id_area DESC LIMIT ?',[limit]);return r}};
