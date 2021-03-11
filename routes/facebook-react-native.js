var express = require('express');
var router = express.Router();
var passport = require('passport');
var cors = require('../cors');
var jwt = require('jsonwebtoken');
var profile_fields = ['public_profile']

let jwtKey = '';
if(process.env.DEVELOPMENT){
    var config = require('../config');
    jwtKey =  config.jsonConfig['key'];
}
else{
    jwtKey = process.env.jwtKey;
}

router.
route('/signup')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-signup-react-native',{
    scope : profile_fields
}));

router
.route('/info')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-signup-react-native',{
    failureRedirect : '/facebook-react-native/fail'
}),(req,res,next)=>{
    console.log(req.user);
    let token = jwt.sign(req.user,jwtKey);
    res.redirect("msrm42app://msrm42app.io?id=" + token);
    // res.status(200).end(". Close the tab/window to proceed with the application");
})



router.
route('/profileInfo')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,(req,res,next)=>{
    res.end("suceess");
})

router
.route('/failed')
.get(cors.corsWithOptions,(req,res,next)=>{
    res.end("failed");
})
router
.route('/login')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-login-react-native',{
    scope : profile_fields
}));

router
.route('/logininfo')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-login-react-native',{
    failureRedirect : '/facebook-react-native/fail'
}),(req,res,next)=>{
    // res.status(200).end("Login successful. Close the tab/window to proceed with the application");
    console.log(req.user);
    let token = jwt.sign(req.user,jwtKey);
    res.redirect("msrm42app://msrm42app.io?id=" + token);
})

module.exports = router;
