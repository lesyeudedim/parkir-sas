const pool=require('../../database/db');
const {asyncHandler,fail,logActivity,positiveInt,requiredString}=require('../utils/helpers');
const actions={};
actions['get /logs']=asyncHandler(async(req,res)=>{const limit=Math.min(100,positiveInt(req.query.limit||30,'limit'));const [rows]=await pool.query('SELECT l.*,u.username FROM tb_log_aktivitas l JOIN tb_user u ON u.id_user=l.id_user ORDER BY l.id_log DESC LIMIT ?',[limit]);res.json({data:rows});});
module.exports=actions;
