const categoryHelpers = require("../helpers/category-helpers")
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const path = require("path");
const fs = require("fs");
const { resourceLimits } = require("worker_threads");


module.exports = {
  loginPage: function (req, res) {
    res.render("admin/admin-login", { error: req.session.error });
    req.session.error = false;
  },

  homepage: async(req, res) => {
    let userCount = await userHelpers.userCount()
    let orderCount = await userHelpers.ordersCount()
    let approvedCount = await userHelpers.approvedCount()
    let cancelledCount = await userHelpers.cancelledCount()
    let CODCount = await userHelpers.CODCount()
    let onlineCount = await userHelpers.onlineCount()
    let categories = await userHelpers.getCategoryNames()
    let monthlyRevenue = await userHelpers.getMonthlySalesBarGraph()
    var categRevenues = []
    for(let i=0;i<categories.length;i++){
      var revenue = await userHelpers.categoryRevenue(categories[i])
      categRevenues.push(revenue)
    }
    let codRevenue = await userHelpers.getPaymentTypeMonthlyRevenue("COD")
    let onlineRevenue = await userHelpers.getPaymentTypeMonthlyRevenue("Online")
    res.render('admin/admin-home',{
      admin: req.session.admin,
      userCount,
      orderCount,
      approvedCount,
      cancelledCount,
      CODCount,
      onlineCount,
      categories,
      categRevenues,
      monthlyRevenue,
      codRevenue,
      onlineRevenue
    });
  },

  adminLogin: (req, res) => {
    enteredCredentials = req.body;
    adminCredentials = {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    };
    if (
      enteredCredentials.email == adminCredentials.email &&
      enteredCredentials.password == adminCredentials.password
    ) {
      req.session.admin = true;
      res.redirect("/admin/home");
    } else {
      req.session.error = true;
      res.redirect("/admin");
    }
  },

  categoriesPage: (req, res) => {
    categoryHelpers.getAllCategories().then((categories) => {
      res.render("admin/categories", {
        categories,
        admin: req.session.admin,
        category: req.session.category,
      });
    });
  },

  addCategory: (req, res, next) => {
    let file = req.file;
    if (!file) {
      const error = new Error("Please choose files");
      error.httpStatusCode = 400;
      return next(error);
    } else {
      const image = req.file.filename;
      req.body.image = image;
      categoryHelpers.addCategory(req.body).then((response)=>{
        req.session.categAdded = true
        res.redirect('/admin/categories')
      });
    }
  },

  deleteCategory: (req, res) => {
    categoryHelpers.deleteCategory(req.params.id).then(() => {
      res.redirect("/admin/categories");
    });
  },

  editCategory: (req, res) => {
    if (req.file) {
      let image = req.file.filename;
      req.body.image = image
    }
    categoryHelpers.updateCategory(req.body, req.params.id).then((oldImage) => {
      if(oldImage){
        var oldImagePath = path.join(
          __dirname,
          "../public/multer-images/category-images/" + oldImage
        );
        fs.unlink(oldImagePath, function (err) {
          if (err) return err;
        });
      }
      res.redirect("/admin/categories");
    });
  },

  productsPage: (req, res) => {
    categoryHelpers.getAllCategories().then((categories) => {
      productHelpers.getAllProducts().then((products) => {
        res.render("admin/products", {
          categories,
          products,
          admin: req.session.admin,
          prodAdded: req.session.prodAdded,
        });
        req.session.prodAdded = false;
      });
    });
  },

  addProduct: (req, res) => {
    if(req.body.featured == 'True'){
      req.body.featured = true
    }else{
      req.body.featured = false
    }
    req.body.price = parseInt(req.body.price)
    req.body.bookprice = parseInt(req.body.bookprice)
    let files = req.files;
    if (!files) {
      const error = new Error("Please choose files");
      error.httpStatusCode = 400;
      return next(error);
    } else {
      const images = [];
      for (i = 0; i < req.files.length; i++) {
        images[i] = req.files[i].filename;
      }
      req.body.images = images;
      productHelpers.addProduct(req.body).then((response) => {
        req.session.prodAdded = true;
        res.redirect("/admin/products");
      });
    }
  },

  deleteProduct: (req, res) => {
    productHelpers.deleteProduct(req.params.id).then((images) => {
      if(images){
        for (i = 0; i < images.length; i++) {
          var oldImagePath = path.join(
            __dirname,
            "../public/multer-images/product-images/" + images[i]
          );
          fs.unlink(oldImagePath, function (err) {
            if (err) return err;
          });
        }
      }
      res.json({productDeleted:true});
    });
  },

  editProduct: (req, res) => {
    if (req.files.length >= 1) {
      const images = [];
      for (i = 0; i < req.files.length; i++) {
        images[i] = req.files[i].filename;
      }
      req.body.images = images;
    }
    req.body.price = parseInt(req.body.price)
    req.body.bookprice = parseInt(req.body.bookprice)
    productHelpers.updateProduct(req.body, req.params.id).then((oldImages) => {
      if (oldImages) {
        for (i = 0; i < oldImages.length; i++) {
          var oldImagePath = path.join(
            __dirname,
            "../public/multer-images/product-images/" + oldImages[i]
          );
          fs.unlink(oldImagePath, function (err) {
            if (err) return err;
          });
        }
      }
      res.redirect("/admin/products");
    });
  },

  categProducts: (req, res) => {
    categId = req.params.id;
    categoryHelpers.getAllCategories().then((categories) => {
      categoryHelpers.getCategoryDetails(categId).then((categoryDetails) => {
        productHelpers
          .getCategoryProducts(categoryDetails.categoryName)
          .then((categProd) => {
            res.render("admin/category-display", {
              admin: req.session.admin,
              categoryDetails,
              categories,
              categProd,
            });
          });
      });
    });
  },
  featureProduct : (req,res)=>{
    
    prodId = req.params.id
    productHelpers.setFeatured(prodId).then(()=>{
      res.json({featured:true})
    })
  },
  getUsers :(req,res)=>{
    userHelpers.getAllUsers().then((users)=>{
      res.render('admin/user-details',{admin: req.session.admin,users})
    })
  },
  changeUserStatus : (req,res)=>{
    userHelpers.changeUserStatus(req.params.id).then(()=>{
      res.json({status:true})
    })
  },

  ordersPage : async(req,res)=>{
    let allOrders = await userHelpers.getAllOrders();
    res.render('admin/orders',{admin: req.session.admin,allOrders})
  },

  orderProducts : async(req,res)=>{
    orderId = req.params.id
    
    let orderProducts = await userHelpers.getOrderProducts(orderId)
    res.render('admin/order-products',{
      admin: req.session.admin,
      orderProducts
    })
  },
  approveOrderStatus : (req,res)=>{
    let ordId = req.params.id
    userHelpers.approveOrder(ordId).then((response)=>{
      res.json({status:true})
    })

  },

  rejectOrderStatus : (req,res)=>{
    let ordId = req.params.id
    userHelpers.rejectOrder(ordId).then((response)=>{
      res.json({status:true})
    })
  },

  couponsPage : async(req,res)=>{
    let coupons = await userHelpers.getAllCoupons()
    res.render('admin/coupons',{
      coupons,
      admin: req.session.admin
    })
  },

  addCoupon : (req,res)=>{
    req.body.discountPrice = parseInt(req.body.discountPrice)
    req.body.minCartPrice = parseInt(req.body.minCartPrice)
    userHelpers.addCoupon(req.body).then((response)=>{
      res.json({status:true})
    })
  },

  deleteCoupon : (req,res)=>{
    userHelpers.deleteCoupon(req.params.id).then((response)=>{
      res.json({couponDeleted:true})
    })
  },

  adminLogout : (req,res)=>{
    req.session.admin = null
    res.redirect('/admin')
  }
};
