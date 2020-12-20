var express = require('express');
var router = express.Router();
var passport = require('passport');
var auth = require('../auth');
var path = require('path');
/* GET home page. */
router.get('/',function(req, res, next) {
  res.sendFile(path.join(__dirname , '../public/login.html'));
});
router.get('/main.html',auth.isAuthenticated, function(req, res, next) {
  res.sendFile(path.join(__dirname , '../public/main.html'));
});



module.exports = router;
