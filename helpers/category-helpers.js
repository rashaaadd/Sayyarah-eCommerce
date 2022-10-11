var db = require('../config/connection')
var collection = require('../config/collections')
const { response } = require('express')
var objectId = require('mongodb').ObjectId


module.exports = {
    addCategory:(category)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(category).then((response)=>{
                resolve(response)
            })
        })
    },
    getAllCategories:()=>{
        return new Promise(async(resolve,reject)=>{
            let categories = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(categories)
        })
    },
    deleteCategory:(categId)=>{
        return new Promise ((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({_id:objectId(categId)}).then((response)=>{
                resolve(response)
            })
        })
    },
    getCategoryDetails:(categId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({_id:objectId(categId)}).then((categDetails)=>{
                resolve(categDetails)
            })
        })
    },

    
    updateCategory:((categDetails,categId)=>{
        console.log(categDetails);
        return new Promise ((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne(
                {_id:objectId(categId)},
                {$set:{
                    categoryName:categDetails.categoryName,
                }}).then(async()=>{
                    if(categDetails.image){
                        oldImage = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({_id:objectId(categId)})
                        db.get().collection(collection.CATEGORY_COLLECTION).updateOne(
                            {_id:objectId(categId)},
                            {$set:
                                {
                                    image : categDetails.image
                                }
                            }
                        ).then(()=>{
                            resolve(oldImage.image)
                        })
                    }else{
                        resolve()
                    }
                })
        })
    }),
    
}