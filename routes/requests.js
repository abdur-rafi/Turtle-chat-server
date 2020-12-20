var express = require('express');
var router = express.Router();
var connect = require('../sql');
var auth = require('../auth');
var cors = require('../cors');

router.route('/')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
  let q = `SELECT requests.group_id,users.username as group_user_name,images.image,messages.message
  FROM
    requests
  JOIN users ON requests.from_user_id=users.user_id
  JOIN images ON images.user_id = requests.from_user_id
  LEFT JOIN members ON requests.from_user_id=members.user_id AND requests.group_id=members.group_id
  LEFT JOIN messages ON members.lastMessage=messages.message_id
  WHERE requests.to_user_id=?`
  
  connect.query(q,[req.user.user_id],(err,result)=>{
    if(err){console.log(err);return next(err)}
    res.status(200).json(result);
  })
})

router.route('/:req_id')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.delete(cors.corsWithOptions,auth.isAuthenticated,(req,res,next) =>{
  let request_id = req.params.req_id;
  let q = `SELECT * FROM requests WHERE request_id = ? AND to_user_id = ?`;
  connect.query(q,[request_id,req.user.user_id],(err,results) => {
    if(err){
      console.log(err);
      return next(err);
    }
    console.log(results);
    if(results.length == 0){
      res.status(404).json({
        message : "request not found"
      });
      return;
    }
    let from_user_id = results[0]['from_user_id'];
    q = `DELETE FROM requests WHERE request_id = ? AND to_user_id = ?`;
    connect.query(q,[request_id,req.user.user_id],(err,results) =>{
      if(err){
        console.log(err);
        return next(err);
      }
      res.status(200).json({
        message : "request deleted"
      });
      q = `INSERT INTO notifications SET ? , created_at = NOW()`;
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
  let q = 'SELECT request_id FROM requests WHERE to_user_id=? AND group_id=?';
  connect.query(q,[req.user.user_id,req.params.req_id],(err,result)=>{
    if(err){console.log(err);return next(err)}
    if(result.length === 0 ){ res.status(404).json([]);return;}
    q = `SELECT message,message_id,sent_at,username,users.user_id,messages.group_id FROM messages JOIN 
      users WHERE messages.user_id = users.user_id AND messages.group_id = ? ORDER BY sent_at ASC`
    connect.query(q,[req.params.req_id],(err,result)=>{
      if(err){console.log(err);return next(err)}
      res.status(200).json(result);
    })
  })

})


router.route('/accept/:group_id')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.post(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
    let q = 'SELECT * FROM requests WHERE to_user_id=? AND group_id=?'
    let req_id =-1;
    connect.query(q,[req.user.user_id,req.params.group_id],(err,results)=>{
        if(err){console.log(err);return next(err)}
        if(results.length === 0){res.status(404).json({message : 'request not found'});return}
        req_id = results[0]['request_id']
        q = 'INSERT INTO friends SET ?,time=NOW()'
        connect.query(q,{user_id:req.user.user_id,friend_id:results[0]['from_user_id']},(err,result)=>{
            if(err){console.log(err);return next(err)}
            q = 'INSERT INTO members SET ?'
            connect.query(q,{user_id:req.user.user_id,group_id:req.params.group_id,name_user_id:results[0]['from_user_id']},(err,result)=>{
                if(err){console.log(err);return next(err)}
                res.status(200).json({message:"success",group_id: parseInt(req.params.group_id)})
            })
            q = 'DELETE FROM requests WHERE request_id=?'
            connect.query(q,[req_id],(err,result)=>{
              if(err){console.log(err);return next(err)}
            })
        })
    })
})

module.exports = router;