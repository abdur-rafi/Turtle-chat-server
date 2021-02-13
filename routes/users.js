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
  let q = `SELECT users.username,users.user_id,images.image FROM users 
  INNER JOIN images 
  ON users.user_id=images.user_id 
  WHERE NOT EXISTS(SELECT * FROM friends WHERE
              users.user_id = friends.friend_id AND friends.user_id = $1) 
              AND users.user_id != $1  AND users.username iLIKE $2 AND users.type = 0;
  `
  connect.query(q,[req.user.user_id,req.params.username+'%'],(err,results)=>{
    if(err){console.log( err);return next(err)}
    // console.log(results);
    res.status(200).json(results.rows);
  })
});

module.exports = router;
