var express = require('express');
var router = express.Router();
var connect = require('../sql');
var auth = require('../auth');
var cors = require('../cors');
var socketList = require('../sockets');
var newGroups = require('../newgroups');

router.route('/')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
  let q = `SELECT 
    requests.group_id,requests.from_user_id as name_user_id,
    users.username as group_user_name,
    images.image,
    messages.message,messages.message_id as lastmessageid,messages.user_id as last_message_user_id
  FROM
    requests
  JOIN users ON requests.from_user_id=users.user_id
  JOIN images ON images.user_id = requests.from_user_id
  LEFT JOIN members ON requests.from_user_id=members.user_id AND requests.group_id=members.group_id
  LEFT JOIN messages ON members.lastMessage=messages.message_id
  WHERE requests.to_user_id=$1`
  
  connect.query(q,[req.user.user_id],(err,result)=>{
    if(err){console.log(err);return next(err)}
    res.status(200).json(result.rows);
  })
})

router.route('/:req_id')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.delete(cors.corsWithOptions,auth.isAuthenticated,(req,res,next) =>{
  let request_id = req.params.req_id;
  let q = `SELECT * FROM requests WHERE request_id = $1 AND to_user_id = $2`;
  connect.query(q,[request_id,req.user.user_id],(err,results) => {
    if(err){
      console.log(err);
      return next(err);
    }
    // console.log(results);
    if(results.rows.length == 0){
      res.status(404).json({
        message : "request not found"
      });
      return;
    }
    let from_user_id = results.rows[0]['from_user_id'];
    q = `DELETE FROM requests WHERE request_id = $1 AND to_user_id = $2`;
    connect.query(q,[request_id,req.user.user_id],(err,results) =>{
      if(err){
        console.log(err);
        return next(err);
      }
      res.status(200).json({
        message : "request deleted"
      });
      q = `INSERT INTO notifications(message,user_id,created_at) VALUES() created_at = NOW()`;
      connect.query(q,{
        message : req.user.username + " did not accept your request",
        user_id : from_user_id
      },(err,results) => {
        if(err){
          console.log(err);
          return next(err);
        }

        q = 'UPDATE users SET notificationsCount = notificationsCount + 1 WHERE user_id = ? ';
        connect.query(q,[from_user_id],(err,results) =>{
          if(err){
            console.log(err);
          }
        })

        q = `SELECT socket_id FROM sockets WHERE user_id = ?`;
        connect.query(q,[from_user_id],(err,results)=>{
          if(err){
            console.log(err);
            return next(err);
          }
          if(results.length == 0) return;
          req.io.to(results[0]['socket_id']).emit('Notification',{
            message : req.user.username + " did not accept your request"
          })
        })
      })
    }) 
  })
})
.get(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
  let q = 'SELECT request_id FROM requests WHERE to_user_id=$1 AND group_id=$2';
  connect.query(q,[req.user.user_id,req.params.req_id],(err,result)=>{
    if(err){console.log(err);return next(err)}
    if(result.rows.length === 0 ){ res.status(404).json([]);return;}
    q = `SELECT message,message_id,sent_at,username,users.user_id,messages.group_id FROM messages JOIN 
      users ON messages.user_id = users.user_id AND messages.group_id = $1 ORDER BY sent_at ASC`
    connect.query(q,[req.params.req_id],(err,result)=>{
      if(err){console.log(err);return next(err)}
      res.status(200).json(result.rows);
    })
  })

})


router.route('/accept/:group_id')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.post(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
    let q = 'SELECT * FROM requests WHERE to_user_id=$1 AND group_id=$2'
    let req_id =-1;
    connect.query(q,[req.user.user_id,req.params.group_id],(err,results)=>{
        if(err){console.log(err);return next(err)}
        if(results.rows.length === 0){res.status(404).json({message : 'request not found'});return}
        req_id = results.rows[0]['request_id']
        q = 'INSERT INTO friends(user_id,friend_id,time) VALUES($1,$2,NOW())'
        connect.query(q,[req.user.user_id,results.rows[0]['from_user_id']],(err,result)=>{
            if(err){console.log(err);return next(err)}
            q = 'INSERT INTO members(user_id,group_id,name_user_id) VALUES($1,$2,$3)'
            connect.query(q,[req.user.user_id,req.params.group_id,results.rows[0]['from_user_id']],(err,result)=>{
                if(err){console.log(err);return next(err)}
                if(newGroups[req.user.user_id]) newGroups[req.user.user_id](req.params.group_id,results.rows[0]['from_user_id']);
                // if(newGroups[req.user.user_id]) newGroups[req.user.user_id] = [...newGroups[req.user.user_id],req.params.group_id]
                // else newGroups[req.user.user_id] = [req.params.group_id];  
                res.status(200).json({
                  message:"success",
                  group_id: parseInt(req.params.group_id),
                  active : socketList.sockets[results.rows[0]['from_user_id']] ? true : false
                })
                console.log("accept func");
                console.log(socketList.sockets[results.rows[0]['from_user_id']] ? true : false);
                console.log(socketList.sockets[results.rows[0]['from_user_id']]);
                if(socketList.sockets[results.rows[0]['from_user_id']]){
                  req.io.to(socketList.sockets[results.rows[0]['from_user_id']]).emit('new-active',{user_id:req.user.user_id})
                }
                q = `UPDATE members SET req = 0 WHERE user_id = $1 AND name_user_id = $2`
                connect.query(q,[results.rows[0]['from_user_id'],req.user.user_id],(err,result)=>{
                  if(err){console.log(err);return next(err)}
                })
            })
            q = 'DELETE FROM requests WHERE request_id=$1'
            connect.query(q,[req_id],(err,result)=>{
              if(err){console.log(err);return next(err)}
            })
        })
    })
})

module.exports = router;