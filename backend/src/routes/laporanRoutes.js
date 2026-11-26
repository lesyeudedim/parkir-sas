const router=require('express').Router();
const c=require('../controllers/laporanController');
const {authenticate,authorize}=require('../middleware/auth');
router.use(authenticate,authorize('owner'));
router.get('/rekap',c['get /rekap']);
module.exports=router;
