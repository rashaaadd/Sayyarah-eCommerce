var express = require('express');
const controllers = require('../controllers/admin-controller')
var router = express.Router();
const productUpload = require('../middleware/product-multer')
const categoryUpload = require('../middleware/category-multer')

/* GET users listing. */
var verifyLogin = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/admin");
  }
};
var verifyLogout = (req,res,next)=>{
  if(req.session.admin){
    res.redirect('/admin/home')
  }else{
    next();
  }
}
router.get('/',verifyLogout,controllers.loginPage);

router.get('/home',verifyLogin,controllers.homepage)

router.post('/adminLogin',controllers.adminLogin)

router.get('/categories',verifyLogin,controllers.categoriesPage)

router.post('/addCategory',categoryUpload.single('image'),controllers.addCategory)

router.get('/products',verifyLogin,controllers.productsPage),

router.post('/addProduct',productUpload.array('images',4),controllers.addProduct)

router.get('/deleteCategory/:id',verifyLogin,controllers.deleteCategory)

router.post('/editCategory/:id',categoryUpload.single('image'),controllers.editCategory)

router.post('/deleteProduct/:id',verifyLogin,controllers.deleteProduct)

router.post('/editProduct/:id',productUpload.array('images',4),controllers.editProduct)

router.get('/category-products/:id',controllers.categProducts)

router.post('/featureProduct/:id',controllers.featureProduct)

router.get('/users',verifyLogin,controllers.getUsers)

router.get('/orders',verifyLogin,controllers.ordersPage)

router.get('/orderProducts/:id',verifyLogin,controllers.orderProducts)

router.post('/approve-order-status/:id',controllers.approveOrderStatus)

router.post('/reject-order-status/:id',controllers.rejectOrderStatus)

router.post('/change-user-status/:id',controllers.changeUserStatus)

router.get('/coupons',verifyLogin,controllers.couponsPage)

router.post('/add-coupon',controllers.addCoupon)

router.post('/delete-coupon/:id',controllers.deleteCoupon)

router.get('/logout',controllers.adminLogout)


module.exports = router;
