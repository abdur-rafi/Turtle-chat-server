var express = require('express');
var router = express.Router();
var connect = require('../sql');
var passport = require('passport');
var auth = require('../auth');
var path = require('path');
var cors = require('../cors');

router.
route('/signup')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('google-signup-react',{
    scope : ['profile','email']
}));

router
.route('/info')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('google-signup-react',{
    failureRedirect : '/google-react/fail'
}),(req,res,next)=>{
    res.status(200).end(". Close the tab/window to proceed with the application");
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
.get(cors.corsWithOptions,passport.authenticate('google-login-react',{
    scope : ['profile','email']
}));

router
.route('/logininfo')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('google-login-react',{
    failureRedirect : '/google-react/fail'
}),(req,res,next)=>{
    res.status(200).end("Login successful. Close the tab/window to proceed with the application");
})

module.exports = router;
