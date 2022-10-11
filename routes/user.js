var express = require('express');
const controllers = require('../controllers/user-controller')
var router = express.Router();

/* GET home page. */
var verifyLogin = (req, res, next) => {
    if (req.session.user) {
      next();
    } else {
      res.redirect("/login");
    }
  };
  var verifyLogout = (req,res,next)=>{
    if(req.session.user){
      res.redirect('/')
    }else{
      next();
    }
  }

router.get('/',controllers.landingPage);

router.get('/login',verifyLogout,controllers.loginPage)

router.post('/login',controllers.userLogin);

router.get('/register',verifyLogout, controllers.registerPage)

router.post('/signup',controllers.userSignUp)

router.get('/otp',controllers.otpPage)

router.post('/verifyOTP',controllers.verifyOTP)

router.get('/profile',verifyLogin,controllers.userProfile)

router.post('/edit-user-data',controllers.editUserDetails)

router.post('/add-address',controllers.addUserAddress)

router.post('/edit-address',controllers.editUserAddress)

router.post('/delete-address/:id',controllers.deleteUserAddress)

router.get('/categorypage/:id',controllers.categoryPage)

router.get('/product-display/:id', controllers.productPage)

router.get('/cart',verifyLogin, controllers.cartPage)

router.get('/addtoCart/:id',verifyLogin,controllers.addToCart)

router.post('/change-product-quantity',controllers.changeProdQuant)

router.post('/delete-cart-product',controllers.deleteCartProd)

router.get('/wishlist',verifyLogin, controllers.wishlistPage)

router.get('/addtoWishlist/:id',verifyLogin,controllers.addtoWishlist)

router.post('/deleteWishlistProd',verifyLogin,controllers.deleteWishlistProd)

router.get('/review-cart',verifyLogin,controllers.reviewCart)

router.post('/place-order',controllers.placeOrder)

router.post('/change-order-address/:id',controllers.changeOrderAddress)

router.get('/order-success/:id',verifyLogin,controllers.orderPage)

router.get('/orders',verifyLogin,controllers.viewOrders)

router.post('/cancel-order/:id',controllers.cancelOrder)

router.get('/view-order-products/:id',verifyLogin,controllers.viewOrderProducts)

router.post('/verify-payment',controllers.verifyPayment)

router.post('/verify-coupon',controllers.verifyCoupon)

router.get('/logout',controllers.userLogout)

module.exports = router;
