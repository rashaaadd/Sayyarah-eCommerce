var db = require('../config/connection')
var collection = require('../config/collections')
const { response } = require('express')
var objectId = require('mongodb').ObjectId

module.exports = {
    addProduct : (product)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
                resolve(data)
            })
        })
    },
    getAllProducts : ()=>{
        return new Promise (async(resolve,reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct:(prodId)=>{
        return new Promise (async(resolve,reject)=>{
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)})
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(prodId)}).then(()=>{
                resolve(product.images)
            })
        })
    },
    getProductDetails:(prodId)=>{
        return new Promise ((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((response)=>{
                resolve(response)
            })
        })
    },
    updateProduct:(prodDetails,prodId)=>{
        return new Promise (async(resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne(
                {_id:objectId(prodId)},
                {$set:{
                    vendor:prodDetails.vendor,
                    model:prodDetails.model,
                    topspeed:prodDetails.topspeed,
                    range:prodDetails.range,
                    categroy:prodDetails.category,
                    bookprice:prodDetails.bookprice
                }}).then(async()=>{
                    if(prodDetails.images){
                        let oldImages = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)})
                        db.get().collection(collection.PRODUCT_COLLECTION).updateOne(
                            {_id:objectId(prodId)},
                            {$set:{
                                images : prodDetails.images
                            }
                            }).then(()=>{
                                resolve(oldImages.images)
                            })
                    }else{
                        resolve()
                    }
                })
        })
    },
    getCategoryProducts : (categName)=>{
        return new Promise(async(resolve,reject)=>{
            let catProducts = await db.get().collection(collection.PRODUCT_COLLECTION).find({category:categName}).toArray()
            resolve(catProducts)
        })
    },
    setFeatured : (prodId)=>{
        return new Promise(async(resolve,reject)=>{
            let featuredValue = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)})
            db.get().collection(collection.PRODUCT_COLLECTION).update(
                {_id:objectId(prodId)},
                {$set:{
                    featured : !featuredValue.featured
                }}).then((response)=>{
                    resolve(response)
                })
        })
    },
    getFeaturedProducts : ()=>{
        return new Promise(async(resolve,reject)=>{
            featuredProds = await db.get().collection(collection.PRODUCT_COLLECTION).find({featured:true}).toArray()
            resolve(featuredProds)
        })
    }
}