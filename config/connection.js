const mongoClient = require('mongodb').MongoClient
const state = {
    db:null
} 
module.exports.connect = function(done){
    const url = 'mongodb+srv://rashaaadd:Rashadrm8@uploader.amezgot.mongodb.net/?retryWrites=true&w=majority'
    const dbname = 'sayyarah'

    mongoClient.connect(url,(err,data)=>{
        if(err) return done(err)
        state.db = data.db(dbname)
        done()
    })
}
module.exports.get = function(){
    return state.db;
}