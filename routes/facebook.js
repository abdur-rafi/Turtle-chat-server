var express = require('express');
var router = express.Router();
var connect = require('../sql');
var passport = require('passport');
var auth = require('../auth');
var path = require('path');

router.get('/signup',passport.authenticate('facebook-signup',{
    scope : ['email','user_photos']
}));

router.get('/info',passport.authenticate('facebook-signup',{
    failureRedirect : '/login.html'
}),(req,res,next)=>{
    // console.log(path.join(__dirname,'/profileInfo' ) );
    console.log("inside info function");
    res.redirect('/main.html');
    // res.json(req.user);
})



router.get('/profileInfo',(req,res,next)=>{
    console.log("inside prfile info function");
    res.end("suceess");
    // console.log("here I an");
})

router.get('/failed',(req,res,next)=>{
    console.log("inside faield  function");
    res.end("failed");
    // console.log("here I an");
})
router.get('/login',passport.authenticate('google-login',{
    scope : ['profile','email']
}));

router.get('/logininfo',passport.authenticate('google-login',{
    failureRedirect : '/google/fail'
}),(req,res,next)=>{
    // console.log(path.join(__dirname,'/profileInfo' ) );
    console.log("inside info function");
    res.redirect('/main.html');
    // res.json(req.user);
})

module.exports = router;
