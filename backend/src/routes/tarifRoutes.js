const router=require('express').Router();
const c=require('../controllers/tarifController');
const {authenticate,authorize}=require('../middleware/auth');
const {asyncHandler}=require('../utils/helpers');
router.use(authenticate,authorize('admin'));
router.get('/',asyncHandler(c.list));router.get('/:id',asyncHandler(c.get));router.post('/',asyncHandler(c.create));router.put('/:id',asyncHandler(c.update));router.delete('/:id',asyncHandler(c.remove));
module.exports=router;
