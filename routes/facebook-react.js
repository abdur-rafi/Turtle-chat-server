var express = require('express');
var router = express.Router();
var passport = require('passport');
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
    res.status(200).end("Account created. Close the tab/window to proceed with the application");
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
.get(cors.corsWithOptions,passport.authenticate('facebook-login-react'));

router
.route('/logininfo')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,passport.authenticate('facebook-login-react',{
    failureRedirect : '/facebook-react/fail'
}),(req,res,next)=>{
    res.status(200).end("Login successful. Close the tab/window to proceed with the application");
})

module.exports = router;
