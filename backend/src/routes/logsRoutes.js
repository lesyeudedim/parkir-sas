const router=require('express').Router();
const c=require('../controllers/logController');
const {authenticate,authorize}=require('../middleware/auth');
router.use(authenticate,authorize('admin'));
router.get('/',c['get /logs']);
module.exports=router;
