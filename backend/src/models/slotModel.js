const pool=require('../../database/db');
const table='tb_slot_parkir';
module.exports={table,async find(id){const [r]=await pool.query('SELECT * FROM '+table+' WHERE id_slot=?',[id]);return r[0]},async list(limit=50){const [r]=await pool.query('SELECT * FROM '+table+' ORDER BY id_slot DESC LIMIT ?',[limit]);return r}};
