var express = require('express');
var router = express.Router();
var connect = require('../sql');
var passport = require('passport');
var auth = require('../auth');
var path = require('path');
var cors = require('../cors');
var profile_fields = ['public_profile']

router.
route('/signup')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-signup-react',{
    scope : profile_fields
}));

router
.route('/info')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-signup-react',{
    failureRedirect : '/facebook-react/fail'
}),(req,res,next)=>{
    // console.log(path.join(__dirname,'/profileInfo' ) );
    console.log("inside info function");
    res.status(200).end("Account created");
    // res.json(req.user);
})



router.
route('/profileInfo')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,(req,res,next)=>{
    console.log("inside prfile info function");
    res.end("suceess");
    // console.log("here I an");
})

router
.route('/failed')
.get(cors.corsWithOptions,(req,res,next)=>{
    console.log("inside faield  function");
    res.end("failed");
    // console.log("here I an");
})
router
.route('/login')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-login-react'));

router
.route('/logininfo')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-login-react',{
    failureRedirect : '/facebook-react/fail'
}),(req,res,next)=>{
    console.log("inside info function");
    res.status(200).end("Login successful");
})

module.exports = router;
