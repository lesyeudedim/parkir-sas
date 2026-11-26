const router=require('express').Router();
const c=require('../controllers/authController');
const {authenticate,authorize}=require('../middleware/auth');
router.post('/login',c['post /login']);
router.get('/me',authenticate,c['get /me']);
router.post('/logout',authenticate,c['post /logout']);
module.exports=router;
