const { response } = require("express");
const categoryHelpers = require("../helpers/category-helpers");
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const twilioHelpers = require('../helpers/twilio-helpers')
const { Db } = require("mongodb");
const createHttpError = require("http-errors");



module.exports = {
  landingPage: async function (req, res, next) {
    let cartCount = null;
    let wishlistCount = null;

    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
      wishlistCount = await userHelpers.getWishlistCount(req.session.user._id);
    }
    req.session.cartCount = cartCount;
    req.session.wishlistCount = wishlistCount;
    categoryHelpers.getAllCategories().then((categories) => {
      productHelpers.getFeaturedProducts().then((products) => {
        res.render("user/landing-page", {
          userLogged: req.session.user,
          user: true,
          categories,
          products,
          cartCount,
          wishlistCount,
        });
      });
    });
  },

  loginPage: (req, res) => {
    res.render("user/user-login", { user: true, error: req.session.error });
    req.session.error = false;
  },

  userLogin: function (req, res, next) {
    userHelpers.userLogin(req.body).then((response) => {
      if (response.status) {
        req.session.user = response.user;
        req.session.userLogged = true;
        res.redirect("/");
      } else {
        req.session.error = true;
        res.redirect("/login");
      }
    });
  },

  registerPage: (req, res) => {
    res.render("user/user-signup", { user: true ,userExist: req.session.userExist});
    req.session.userExist = false
  },

  userSignUp: (req, res) => {
    req.body.status = true;
    userHelpers.checkUserExist(req.body).then((response)=>{
      if(response.userExist){
        req.session.userExist = true;
        res.redirect("/register");
      }else{
        twilioHelpers.doSms(req.body).then((data) => {
          req.session.body = req.body
          console.log(req.body);
          console.log(req.session.body);
          if (data.valid) {
            res.redirect('/otp')
          } else {
            res.redirect('/register')
          }
        })
      }
    })
    
  },

  otpPage : (req,res)=>{
    res.render('user/otp',{
      user: true,
      invalid:req.session.invalidOTP
    })
    req.session.invalidOTP = false
  },

  verifyOTP : (req,res)=>{
    console.log(req.body,'brrrrrr');
    console.log(req.session.body,'tayoli')
    twilioHelpers.otpVerify(req.body, req.session.body).then((response) => {
      if (response.valid) {
        userHelpers.addUser(req.session.body).then((data) => {
          userHelpers.getUserDetails(data).then((data) => {
            req.session.userLogged = true;
            req.session.user = data;
            res.redirect("/");
          });
        })
      } else {
        req.session.invalidOTP = true
        res.redirect('/otp')
      }
    })

  },

  userProfile: async (req, res,next) => {
    let userDetails = await userHelpers.getUserDetails(req.session.user._id)
    let userAddresses = await userHelpers.getUserAddresses(
      req.session.user._id
    );
    let orderDetails = await userHelpers.getAllOrders(req.session.user._id)
    // if (userAddresses.userAddressNotExist) {
    //   next(createError(404));
    // } else {
      res.render("user/user-profile", {
        userLogged: req.session.user,
        cartCount: req.session.cartCount,
        wishlistCount: req.session.wishlistCount,
        userAddresses,
        orderDetails,
        userDetails
      });
    // }
  },

  editUserDetails : (req,res)=>{
    userHelpers.editUserData(req.body,req.session.user._id).then((response)=>{
      res.json({status:true})
    })
  },

  addUserAddress: (req, res) => {
    userHelpers
      .addUserAddress(req.body, req.session.user._id)
      .then((response) => {
        res.json({ status: true });
      });
  },

  editUserAddress: (req, res) => {
    userHelpers.editAddress(req.body,req.session.user._id).then((response)=>{
      res.json({status:true})
    })
  },

  deleteUserAddress: (req,res)=>{
    userHelpers.deleteUserAddress(req.params.id,req.session.user._id).then((response)=>{
      res.json({deleteProduct:true})
    })
  },

  categoryPage: (req, res) => {
    categId = req.params.id;
    categoryHelpers.getAllCategories().then((categories) => {
      categoryHelpers.getCategoryDetails(categId).then((categoryDetails) => {
        productHelpers
          .getCategoryProducts(categoryDetails.categoryName)
          .then((categProd) => {
            res.render("user/category-page", {
              userLogged: req.session.user,
              user: true,
              cartCount: req.session.cartCount,
              wishlistCount: req.session.wishlistCount,
              categoryDetails,
              categories,
              categProd,
            });
          });
      });
    });
  },

  productPage: (req, res) => {
    prodId = req.params.id;
    productHelpers.getProductDetails(prodId).then((product) => {
      res.render("user/product-display", {
        userLogged: req.session.user,
        cartCount: req.session.cartCount,
        wishlistCount: req.session.wishlistCount,
        prodExist: req.session.prodExist,
        user: true,
        product,
      });
      req.session.prodExist = false;
    });
  },

  cartPage: async (req, res) => {
    let userDetails = req.session.user;
    if (userDetails) {
      let cartCount = await userHelpers.getCartCount(req.session.user._id);
      let products = await userHelpers.getCartProducts(req.session.user._id);
      let total = 0 
      let totalBookingPrice = 0
      if(products.length>0){
        total = await userHelpers.getTotalPrice(req.session.user._id);
        totalBookingPrice = await userHelpers.getTotalBookingPrice(
          req.session.user._id
        );
      }
      res.render("user/cart-page", {
        userLogged: req.session.user,
        cartCount,
        wishlistCount: req.session.wishlistCount,
        user: true,
        products,
        total,
        totalBookingPrice,
      });
    } else {
      res.redirect("/login");
    }
  },

  addToCart: (req, res) => {
    let prodId = req.params.id;
    let userId = req.session.user._id;
    userHelpers.addToCart(prodId, userId).then(async () => {
      let details = {
        user: userId,
        product: prodId,
      };
      userHelpers.deleteWishlistProduct(details).then(() => {
        res.redirect("/");
      });
    });
  },

  changeProdQuant: (req, res) => {
    userHelpers.changeProdQuant(req.body).then(async (response) => {
      response.total = await userHelpers.getTotalPrice(req.body.user);
      response.totalBookingPrice = await userHelpers.getTotalBookingPrice(
        req.body.user
      );
      res.json(response);
    });
  },

  deleteCartProd: (req, res) => {
    userHelpers.deleteCartProduct(req.body).then((response) => {
      res.json(response);
    });
  },

  wishlistPage: async (req, res) => {
    let wishlistCount = await userHelpers.getWishlistCount(
      req.session.user._id
    );
    let wishlistProds = await userHelpers.getWishlistProducts(
      req.session.user._id
    );
    res.render("user/wishlist", {
      userLogged: req.session.user,
      wishlistProds,
      cartCount: req.session.cartCount,
      wishlistCount,
    });
  },

  addtoWishlist: (req, res) => {
    let prodId = req.params.id;
    let userId = req.session.user._id;
    userHelpers.addtoWishlist(prodId, userId).then((response) => {
      if (response.prodExist) {
        req.session.prodExist = response.prodExist;
        res.redirect("/product-display/" + prodId);
      } else {
        res.redirect("/");
      }
    });
  },

  deleteWishlistProd: (req, res) => {
    userHelpers.deleteWishlistProduct(req.body).then((response) => {
      res.json(response);
    });
  },

  reviewCart: async (req, res) => {
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    let products = await userHelpers.getCartProducts(req.session.user._id);
    let total = await userHelpers.getTotalPrice(req.session.user._id);
    let totalBookingPrice = await userHelpers.getTotalBookingPrice(
      req.session.user._id
    );
    let addresses = await userHelpers.getUserAddresses(req.session.user._id)
    res.render("user/review-cart", {
      userLogged: req.session.user,
      cartCount,
      wishlistCount: req.session.wishlistCount,
      total,
      totalBookingPrice,
      products,
      addresses
    });
  },

  placeOrder: async(req, res) => {
    console.log(req.body);
    let products = await userHelpers.getCartProductList(req.session.user._id);
    //------------updated with better method
    // let totalBookingPrice = await userHelpers.getTotalBookingPrice(
    //   req.session.user._id
    // );
    // totalBookingPrice.total += 0.05 * totalBookingPrice.total;
    //----------end
    let user = await userHelpers.getUserDetails(req.session.user._id)
    let address = await userHelpers.getOrderAddress(req.session.user._id,user.currAddress)
    userHelpers
      .placeOrder(req.body,address, products,req.session.user._id)
      .then((response) => {
        console.log(response);
        if(req.body['payment-method']=='COD'){
          response.codSuccess = true
          res.json(response);
        }else if(req.body['payment-method']=='Online'){
          userHelpers.generateRazorPay(response.insertedId,req.body.orderGrandTotal).then((success)=>{
            userHelpers.getOrderDetails(response.insertedId).then((result)=>{
              success.orderDetails = result
              success.user = req.session.user
              res.json(success)
            })
          })
        }else{
          response.status = false
          res.json(response);
        }
      });
  },

  cancelOrder : (req,res)=>{
    let ordId = req.params.id
    userHelpers.cancelOrder(ordId).then((response)=>{
      res.json({cancelled:true})
    })

  },

  orderPage: async (req, res) => {
    let orderDetails = await userHelpers.getOrderDetails(req.params.id);
    let totalBookingPrice = orderDetails.totalAmount
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    totalBookingPrice += 0.05 * totalBookingPrice;
    res.render("user/order-page", {
      userLogged: req.session.user,
      wishlistCount: req.session.wishlistCount,
      orderDetails,
      totalBookingPrice,
      cartCount
    });
  },

  changeOrderAddress: (req,res)=>{
    addId = req.params.id
    userId = req.session.user._id
    userHelpers.changeOrderAddressStatus(addId,userId).then((response)=>{
      res.json({status:true})
    })
  },

  viewOrders: async(req,res)=>{
    let orderDetails = await userHelpers.getAllOrders(req.session.user._id)
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    res.render("user/orders",{
      userLogged: req.session.user,
      cartCount,
      wishlistCount: req.session.wishlistCount,
      orderDetails
    })
  },

  viewOrderProducts : async(req,res)=>{
    orderId = req.params.id
    let orderProducts = await userHelpers.getOrderProducts(orderId)
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    res.render('user/view-order-products',{
      userLogged: req.session.user,
      cartCount,
      wishlistCount: req.session.wishlistCount,
      orderProducts
    })
  },

  verifyPayment : (req,res)=>{
    console.log(req.body,'brrrrrrr myre');
    userHelpers.verifyPayment(req.body).then((response)=>{
      userHelpers.bookedOrder(req.body['order[receipt]']).then(()=>{
        console.log("Payement is successfull brrrrrrrrrrrrrrrr");
        console.log({status:true,ordId:req.body['order[receipt]']},'dracaaarys');
        res.json({status:true,ordId:req.body['order[receipt]']})
      })
    }).catch((err)=>{
      console.log(err);
      res.json({status:false,errMsg:err})
    })
  },

  verifyCoupon : async(req,res)=>{
    console.log(req.body);
    let totalBookingPrice = await userHelpers.getTotalBookingPrice(
      req.session.user._id
    );
    totalBookingPrice.total += 0.05 * totalBookingPrice.total;
    userHelpers.verifyCoupon(req.body.couponCode,req.session.user._id,totalBookingPrice.total).then((response)=>{
      // if(response.valid){
      //   req.session.coupon = response
      // }
      res.json(response)
    })
  },

  userLogout: (req, res) => {
    req.session.user = null;
    res.redirect("/");
  },
};
