var express = require('express');
var router = express.Router();
var connect = require('../sql');
var bcrypt = require('bcryptjs');
var passport = require('passport');
var auth = require('../auth');
var cors = require('../cors');

router.route('/')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,auth.isAuthenticated,(req,res,next) =>{
    let q;

    q = `SELECT messages FROM notifications JOIN users ON notifications.user_id = users.user_id AND notifications.user_id = ?`

    connect.query(q,[req.user.user_id],(err,results)=>{
        if(err){
            console.log(err);
            return next(err);
        }
        res.status(200).json(results);
    })
})

router.route('/reset')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.post(cors.corsWithOptions,auth.isAuthenticated,(req,res,next) => {
    let q = 'UPDATE users SET notificationsCount = 0 WHERE user_id = ?';
    connect.query(q,[req.user.user_id],(err,results) => {
        if(err){
            console.log(err);
            return next(err);
        }
        res.status(200).json({
            message : "successful"
        });
    })
})


module.exports = router;