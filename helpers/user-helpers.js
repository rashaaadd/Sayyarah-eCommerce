var db = require("../config/connection");
var collection = require("../config/collections");
var bcrypt = require("bcrypt");
const { response } = require("express");
var objectId = require("mongodb").ObjectId;
const Razorpay = require("razorpay");

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

module.exports = {
  addUser: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          resolve(data.insertedId);
        });
    });
  },
  userLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email, status: true });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            console.log("Login success");
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            console.log("Login failed");
            response.status = false;
            resolve({ response });
          }
        });
      } else {
        console.log("Login failed");
        response.status = false;
        resolve({ response });
      }
    });
  },

  checkUserExist : (userData)=>{
    return new Promise(async(resolve, reject) => {
      let userExist = await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email})
      if(userExist){
        resolve({userExist:true})
      }else{
        resolve({userExist:false})
      }
    })
  },
  getUserDetails: (userid) => {
    return new Promise(async (resolve, reject) => {
      let userData = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userid) });
      resolve(userData);
    });
  },

  editUserData: (details, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              fname: details.fname,
              lname: details.lname,
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray()
        .then((response) => {
          resolve(response);
        });
    });
  },

  changeUserStatus: (userId) => {
    return new Promise(async (resolve, reject) => {
      let userStatus = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) });
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              status: !userStatus.status,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  addToCart: (prodId, userId) => {
    return new Promise(async (resolve, reject) => {
      let prodObj = {
        item: objectId(prodId),
        quantity: 1,
      };
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        let prodExist = userCart.products.findIndex(
          (product) => product.item == prodId
        );
        if (prodExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { "products.item": objectId(prodId), user: objectId(userId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then((response) => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: {
                  products: prodObj,
                },
              }
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let cartObj = await {
          user: objectId(userId),
          products: [prodObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: "$product",
          },
        ])
        .toArray();
      resolve(userCart);
    });
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },

  changeProdQuant: (details) => {
    details.count = parseInt(details.count);
    details.quantity = parseInt(details.quantity);
    return new Promise(async (resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              "products.item": objectId(details.product),
              _id: objectId(details.cart),
            },
            {
              $inc: { "products.$.quantity": details.count },
            }
          )
          .then((response) => {
            resolve({ status: true });
          });
      }
    });
  },
  deleteCartProduct: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectId(details.cart) },
          {
            $pull: { products: { item: objectId(details.product) } },
          }
        )
        .then((response) => {
          resolve({ deleteProduct: true });
        });
    });
  },
  getTotalPrice: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: "$product",
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$product.price", "$quantity"] } },
            },
          },
        ])
        .toArray();
      resolve(total[0]);
    });
  },

  getTotalBookingPrice: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: "$product",
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: { $multiply: ["$product.bookprice", "$quantity"] },
              },
            },
          },
        ])
        .toArray();
      resolve(total[0]);
    });
  },

  getWishlistCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let wishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (wishlist) {
        count = wishlist.products.length;
      }
      resolve(count);
    });
  },

  addtoWishlist: (prodId, userId) => {
    return new Promise(async (resolve, reject) => {
      product = objectId(prodId);
      let userWishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userWishlist) {
        let prodExist = userWishlist.products.findIndex(
          (product) => product == prodId
        );
        if (prodExist != -1) {
          resolve({ prodExist: true });
        } else {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: {
                  products: product,
                },
              }
            )
            .then((response) => {
              resolve(response);
            });
        }
      } else {
        prodObj = {
          user: objectId(userId),
          products: [product],
        };
        db.get()
          .collection(collection.WISHLIST_COLLECTION)
          .insertOne(prodObj)
          .then((response) => {
            resolve(response);
          });
      }
    });
  },

  getWishlistProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wishlistProducts = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "products",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: "$product",
          },
        ])
        .toArray();
      resolve(wishlistProducts);
    });
  },

  deleteWishlistProduct: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          { user: objectId(details.user) },
          {
            $pull: { products: objectId(details.product) },
          }
        )
        .then((response) => {
          resolve({ deleteProduct: true });
        });
    });
  },

  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      resolve(cart.products);
    });
  },

  getOrderAddress: (userId, addId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId), "addresses._addId": addId });
        let addressIndex = user.addresses.findIndex(
          (address) => address._addId == addId
        );
        if(addressIndex != -1){
          resolve(user.addresses[addressIndex]);
        }
      } catch (error) {
        reject(error)
      }
    });
  },

  placeOrder: (order, address, products, userId) => {
    return new Promise(async (resolve, reject) => {
      var orderObj = {}
      let couponId = order.couponId;
      let status = order["payment-method"] === "COD" ? "Booked" : "Pending";
      if(order.discount){
        orderObj = {
            user: objectId(userId),
            deliveryDetails: {
            name: address.name,
            address: address.address,
            city: address.city,
            state: address.state,
            country: address.country,
            pincode: address.pincode,
            contact: address.contact,
          },
          paymentMethod: order["payment-method"],
          products: products,
          totalAmount: parseInt(order.orderGrandTotal),
          discount: parseInt(order.discount),
          status: status,
          date: new Date(),
        };
      }else{
        orderObj = {
          user: objectId(userId),
          deliveryDetails: {
            name: address.name,
            address: address.address,
            city: address.city,
            state: address.state,
            country: address.country,
            pincode: address.pincode,
            contact: address.contact,
          },
          paymentMethod: order["payment-method"],
          products: products,
          totalAmount: parseInt(order.orderGrandTotal),
          status: status,
          date: new Date(),
        };
      }
      if (couponId) {
        let coupon = await db
          .get()
          .collection(collection.COUPON_COLLECTION)
          .findOne({ _id: objectId(couponId) });
        if (coupon.users) {
          await db
            .get()
            .collection(collection.COUPON_COLLECTION)
            .updateOne(
              { _id: objectId(couponId) },
              {
                $push: { users: objectId(userId) },
              }
            );
        } else {
          let users = [objectId(userId)];
          await db
            .get()
            .collection(collection.COUPON_COLLECTION)
            .updateOne(
              { _id: objectId(couponId) },
              {
                $set: { users: users },
              }
            );
        }
      }

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: objectId(userId) })
            .then((result) => {
              resolve(response);
            });
        });
    });
  },

  getOrderDetails: (ordId) => {
    return new Promise(async (resolve, reject) => {
      let orderDetails = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: objectId(ordId) });
      resolve(orderDetails);
    });
  },

  addUserAddress: (address, userId) => {
    return new Promise(async (resolve, reject) => {
      create_random_id(15);
      function create_random_id(string_Length) {
        var randomString = "";
        var numbers = "1234567890";
        for (var i = 0; i < string_Length; i++) {
          randomString += numbers.charAt(
            Math.floor(Math.random() * numbers.length)
          );
        }
        address._addId = "ADD" + randomString;
      }

      let userDetails = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) });
      if (userDetails.addresses) {
        db.get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: objectId(userId) },
            {
              $push: {
                addresses: address,
              },
              $set: {
                currAddress: address._addId,
              },
            }
          )
          .then((response) => {
            resolve();
          });
      } else {
        db.get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: objectId(userId) },
            {
              $set: {
                addresses: [address],
                currAddress: address._addId,
              },
            }
          )
          .then((response) => {
            resolve();
          });
      }
    });
  },

  getUserAddresses: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) });
      if (user) {
        resolve(user.addresses);
      } else {
        resolve({ userAddressNotExist: true });
      }
    });
  },

  editAddress: (address, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId), "addresses._addId": address._addId },
          {
            $set: {
              "addresses.$.name": address.name,
              "addresses.$.address": address.address,
              "addresses.$.city": address.city,
              "addresses.$.state": address.state,
              "addresses.$.country": address.country,
              "addresses.$.pincode": address.pincode,
              "addresses.$.contact": address.contact,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },

  deleteUserAddress: (addId, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId), "addresses._addId": addId },
          {
            $pull: {
              addresses: { _addId: addId },
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },

  changeOrderAddressStatus: (addId, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: { currAddress: addId }
          }
        )
        .then((response) => {
          resolve(response);
        }).catch((err) => {
          console.log(err);
          reject(err)
        })

    });
  },

  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      let allOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .toArray();
      resolve(allOrders);
    });
  },

  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderProducts = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: objectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              prodId: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "prodId",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: "$product",
          },
        ])
        .toArray();
      resolve(orderProducts);
    });
  },

  approveOrder: (ordId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(ordId) },
          {
            $set: {
              status: "Approved",
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  rejectOrder: (ordId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(ordId) },
          {
            $set: {
              status: "Rejected",
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  bookedOrder: (ordId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(ordId) },
          {
            $set: {
              status: "Booked",
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  cancelOrder: (ordId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(ordId) },
          {
            $set: {
              status: "Cancelled",
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  generateRazorPay: (ordId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: total * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "" + ordId,
      };
      instance.orders.create(options, function (err, order) {
        if(err){
          reject(err);
        }else{
          resolve(order);
        }
      });
    });
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");

      if (hmac == details["payment[razorpay_signature]"]) {
        resolve(details["reciept"]);
      } else {
        reject();
      }
    });
  },

  addCoupon: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.COUPON_COLLECTION)
        .insertOne(details)
        .then((response) => {
          resolve(response);
        });
    });
  },

  deleteCoupon: (coupId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.COUPON_COLLECTION)
        .deleteOne({ _id: objectId(coupId) })
        .then((response) => {
          resolve(response);
        });
    });
  },

  getAllCoupons: () => {
    return new Promise(async (resolve, reject) => {
      let coupons = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .find()
        .toArray();
      resolve(coupons);
    });
  },

  verifyCoupon: (coupon, userId, subtotal) => {
    return new Promise(async (resolve, reject) => {
      let couponExist = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .findOne({ code: coupon });
      if (couponExist) {
        let date = new Date();
        date = date.toJSON().slice(0, 10);
        if (date > couponExist.expiryDate) {
          console.log("Expired Coupon");
          resolve({ expired: true });
        } else {
          let user = await db
            .get()
            .collection(collection.COUPON_COLLECTION)
            .findOne({ code: coupon, users: { $in: [objectId(userId)] } });
          if (user) {
            console.log("Used Coupon");
            resolve({ used: true });
          } else {
            if (subtotal < couponExist.minCartPrice) {
              couponExist.orderLimit = true;
              resolve(couponExist);
            } else {
              couponExist.valid = true;
              resolve(couponExist);
            }
          }
        }
      } else {
        resolve({ invalid: true });
      }
    });
  },

  userCount: () => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      resolve(user.length);
    });
  },

  ordersCount: () => {
    return new Promise(async (resolve, reject) => {
      let order = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .toArray();
      resolve(order.length);
    });
  },

  approvedCount: () => {
    return new Promise(async (resolve, reject) => {
      let approvedOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ status: "Approved" })
        .toArray();
      resolve(approvedOrders.length);
    });
  },

  cancelledCount: () => {
    return new Promise(async (resolve, reject) => {
      let cancelledOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ status: "Cancelled" })
        .toArray();
      resolve(cancelledOrders.length);
    });
  },

  CODCount: () => {
    return new Promise(async (resolve, reject) => {
      let codCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ paymentMethod: "COD",status:"Approved" })
        .toArray();
      resolve(codCount.length);
    });
  },

  onlineCount: () => {
    return new Promise(async (resolve, reject) => {
      let onlineCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ paymentMethod: "Online",status:"Approved" })
        .toArray();
      resolve(onlineCount.length);
    });
  },

  categoryRevenue: (categName) => {
    return new Promise(async (resolve, reject) => {
      let categoryRevenue = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { status: "Approved" },
          },
          {
            $unwind: "$products",
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "products.item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: "$product",
          },
          {
            $project: {
              category: "$product.category",
              quantity: "$products.quantity",
              prodPrice: "$product.bookprice",
              total: {
                $multiply: ["$products.quantity", "$product.bookprice"],
              },
            },
          },
          {
            $match: {
              category: categName,
            },
          },
          {
            $project: {
              _id: 0,
              total: 1,
            },
          },
        ])
        .toArray();
      let totalCategRevenue = 0;
      for (i = 0; i <= categoryRevenue.length - 1; i++) {
        totalCategRevenue += categoryRevenue[i].total;
      }
      resolve(totalCategRevenue);
    });
  },
  getCategoryNames: () => {
    return new Promise(async (resolve, reject) => {
      let categories = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .aggregate([
          {
            $project: {
              _id: 0,
              categName: "$categoryName",
            },
          },
        ])
        .toArray();
      let categoryNames = [];
      for (i = 0; i < categories.length; i++) {
        categoryNames.push(categories[i].categName);
      }
      resolve(categoryNames);
    });
  },

  getMonthlySalesBarGraph: () => {
    return new Promise(async(resolve, reject) => {
      let today = new Date();
      let before = new Date(today.getTime() - 250 * 24 * 60 * 60 * 1000);
      let monthlySales = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "Approved",
              date: {
                $gte: before,
                $lte: today,
              },
            },
          },
          {
            $project: {
              _id:0,
              date: 1,
              totalAmount: 1,
            },
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: "%m-%Y", date: "$date" } },
              },
              monthlySales: { $sum: "$totalAmount" },
            },
          }
        ])
        .toArray();
        resolve(monthlySales)
    });
  },

  getPaymentTypeMonthlyRevenue : (paymentMode)=>{
    return new Promise(async(resolve, reject) => {
      let today = new Date();
      let before = new Date(today.getTime() - 250 * 24 * 60 * 60 * 1000);
      let paymentTypeRevenue = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            status: "Approved",
            date: {
              $gte: before,
              $lte: today,
            },
            paymentMethod:paymentMode
          },
        },
        {
          $project: {
            _id:0,
            date: 1,
            totalAmount: 1,
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%m-%Y", date: "$date" } },
            },
            monthlySales: { $sum: "$totalAmount" },
          },
        },
        {
          $sort:{_id:1}
        }
      ]).toArray()
      resolve(paymentTypeRevenue)
    })
  }
};
