require('dotenv').config()
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const db = require("./config/connection");
const session = require("express-session");
const sessionLimit = require("./config/session");
var expbs = require("express-handlebars");
const Swal = require('sweetalert2')




var userRouter = require("./routes/user");
var adminRouter = require("./routes/admin");

var app = express();
const hbs = expbs.create({
  extname: "hbs",
  defaultLayout: "layout",
  layoutsDir: __dirname + "/views/layout/",
  partialsDir: __dirname + "/views/layout/partials/",

  //custom helpers
  helpers: {
    upperCase: function (string) {
      return string.toUpperCase();
    },
    length: function (array) {
      return array.length;
    },
    lengthIsZero: function(array){
      return array.length == 0
    },
    getGIF: function (array) {
      for (let i = 0; i < array.length; i++) {
        if (array[i].slice(-3) === "gif") {
          return array[i];
        }
      }
    },
    getNotGIF : function(array){
      result = array
      for (let i = 0; i < result.length; i++) {
        if (result[i].slice(-3) === "gif") {
          result.splice(i,1)
          return(result);
        }
      }
    },
    not : function(value){
      return !value
    },
    check:(test)=>{
      return test? 'text-success':'text-danger'
    },
    inc:(number)=>{
      return number+1
    },
    tax:(number)=>{
      return (5/100)*number
    },
    sum:(num1,num2)=>{
      return num1+num2
    },
    // capitalize:(word)=>{
    //   return word[0].toUpperCase() + word.slice(1).toLowerCase();
    // }
    bookedOrPending: (status)=>{
      if(status === 'Booked' || status === 'Pending'){
        return true
      }else{
        return false
      }
    },
    orderBooked : (status)=>{
      if(status === 'Booked'){
        return true
      }else{
        return false
      }
    },
    orderRejected : (status)=>{
      if(status === 'Rejected'){
        return true
      }else{
        return false
      }
    },
    orderPending : (status)=>{
      if(status === 'Pending'){
        return true
      }else{
        return false
      }
    },
    orderCancelled : (status)=>{
      if(status === 'Cancelled'){
        return true
      }else{
        return false
      }
    },
    orderApproved : (status)=>{
      if(status === 'Approved'){
        return true
      }else{
        return false
      }
    },
  },
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.engine("hbs", hbs.engine);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(session(sessionLimit));
db.connect((err) => {
  if (err) console.log("Connection Error " + err);
  else console.log("Database connected");
});
app.use(function (req, res, next) {
  res.header(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  next();
});

app.use("/", userRouter);
app.use("/admin", adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
