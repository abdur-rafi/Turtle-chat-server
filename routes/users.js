var express = require('express');
var router = express.Router();
var connect = require('../sql');
var auth = require('../auth');
/* GET users listing. */
var cors = require('../cors');
router.route('/')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,auth.isAuthenticated, function(req, res, next) {
  res.status(200).json({
    username : req.user.username,
    notificationsCount : req.user.notificationsCount,
    user_id : req.user.user_id,
    firstname : req.user.firstname,
    lastname : req.user.lastname,
    email : req.user.email,
    newrequests : req.user.newrequests
  })
});

router.route('/:username')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,auth.isAuthenticated, function(req, res, next) {
  let q = 'SELECT users.username,users.user_id,images.image FROM users JOIN images ON users.user_id=images.user_id AND users.user_id != ? AND users.username LIKE ?'
  connect.query(q,[req.user.user_id,req.params.username+'%'],(err,results)=>{
    if(err){console.log(err);return next(err)}
    res.status(200).json(results);
  })
});

module.exports = router;
