var express = require('express');
var router = express.Router();
var connect = require('../sql');
var bcrypt = require('bcryptjs');
var passport = require('passport');
var auth = require('../auth');
var cors = require('../cors');
var socketList = require('../sockets');
var newGroups = require('../newgroups');

router.route('/')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.get(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
    let user_id = req.user.user_id;
    console.log(process.env.PORT);
    let  q;
    q = `SELECT 
            members.group_id,members.lastSeen as userlastSeen,members.lastMessage as lastMessageId,
            members.name_user_id,members.req,
            members2.lastSeen,users.username as group_user_name,
            mgroups.name as group_name ,mgroups.last_time,
            images.image,messages.message,messages.user_id as last_message_user_id 
        FROM 
            members members
        LEFT JOIN
            members members2 ON members.name_user_id=members2.user_id AND members.group_id=members2.group_id
        JOIN 
            mgroups ON members.group_id = mgroups.group_id
        JOIN
            users ON members.name_user_id = users.user_id
        JOIN
            images ON images.user_id = users.user_id
        LEFT JOIN
            messages ON messages.message_id=members.lastMessage
        WHERE 
            members.user_id = $1 ORDER BY mgroups.last_time DESC`
    connect.query(q,[user_id],(err,results) =>{
        if(err){console.log(err);return next(err);}
        q = `SELECT image FROM images WHERE user_id=$1`
        connect.query(q,[user_id],(err,result)=>{
            if(err){console.log(err);}
            let img = undefined;
            if(result.rows.length !== 0){
                img = result.rows[0]['image']
            }
            let i = 0;
            for(i = 0;i < results.rows.length;++i){
                results.rows[i]['bold'] = false;
                if(results.rows[i]['lastMessageId'] !== results.rows[i]['userlastSeen']){
                    results.rows[i]['bold'] = true;
                }
                if(!results.rows[i].req && socketList.sockets[results.rows[i]['name_user_id']]){
                    results.rows[i]['active'] = true;
                    req.io.to(socketList.sockets[results.rows[i]['name_user_id']])
                    .emit('new-active',{
                        user_id:req.user.user_id
                    });
                }
                else results.rows[i]['active'] = false;
            }
            let user = {
                user_id:req.user.user_id,
                username:req.user.username,
                image:img
            }
            res.status(200).json({
                groups:results.rows,
                user:user
            });
        })
        
    })
})

router.route('/:group_id')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.post(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
    let message = req.body.message;
    if(!message){
        return res.status(400).json({
            message : "message body is empty"
        })
    }
    let group_id = req.params.group_id;
    let user_id = req.user.user_id;
    if(typeof(group_id) === "string" && group_id.substring(0,7)==='request'){
        group_id = group_id.substring(7);
        group_id = parseInt(group_id);
        let q = 'INSERT INTO friends(user_id,friend_id,time) VALUES ($1,$2,NOW())'
        connect.query(q,[req.user.user_id,group_id],(err,results)=>{
            if(err){console.log(err);return next(err)}
            // console.log("inserted into friends");
            q = 'INSERT INTO mgroups(created_at) VALUES(NOW()) RETURNING group_id'
            connect.query(q,(err,results)=>{
                if(err){console.log(err);return next(err)}
                let created_group_id = results.rows[0].group_id;
                q = 'INSERT INTO members(user_id,group_id,name_user_id,req) VALUES($1,$2,$3,1)'
                connect.query(q,[user_id,created_group_id,group_id],(err,results)=>{
                    if(err && err.errno === '23505'){
                        q = 'DELETE FROM mgroups WHERE group_id = $1'
                        connect.query(q,[created_group_id],(err,results)=>{});
                        q = 'SELECT * FROM members WHERE user_id=$1 AND name_user_id= $2'
                        connect.query(q,[user_id,group_id],(err,results)=>{
                            if(err){console.log(err);return next(err)}
                            created_group_id = results.rows[0]['group_id'];
                            q = 'INSERT INTO requests(to_user_id,from_user_id,group_id,sent_at) VALUES($1,$2,$3,NOW())';
                            connect.query(q,[group_id,user_id,created_group_id],(err,results)=>{
                                if(err){console.log("req insert error",err)}
                                if(!err){
                                    q = 'SELECT * FROM images WHERE user_id=$1'
                                    connect.query(q,[req.user.user_id],(err,results)=>{
                                        if(err){console.log("sel img error",err);}
                                        if(socketList.sockets[group_id]) req.io.to(socketList.sockets[group_id])
                                        .emit('new-request',{
                                            group_id : created_group_id,
                                            group_user_name : req.user.username,
                                            name_user_id : req.user.user_id,
                                            image:results.rows[0]['image']
                                        })
                                    })
                                }
                                q = `INSERT INTO messages(group_id,user_id,message,sent_at) VALUES($1,$2,$3,NOW()) RETURNING message_id`
                                connect.query(q,[created_group_id, user_id,message],(err,results) => {
                                    if(err){console.log(err);return next(err)}
                                    res.status(200).json({
                                        message : "message sent successfully",
                                        group_id : created_group_id,
                                        request:req.params.group_id,
                                        sendingId:req.body.sendingId,
                                        message_id:results.rows[0].message_id
                                    });
                                    q = `UPDATE members SET lastMessage = $1 WHERE group_id = $2`
                                    connect.query(q,[results.rows[0].message_id,created_group_id],(err,results) => {
                                        if(err){console.log("update memnbers error",err);return}
                                        q = `UPDATE members SET lastSeen=lastMessage WHERE user_id = $1 AND group_id = $2`
                                        connect.query(q,[user_id,created_group_id],(err,results)=>{if(err){console.log("lastseen update error,",err)}})
                                    })
                                    
                                    q = 'UPDATE mgroups SET last_time = NOW() WHERE group_id = $1'
                                    connect.query(q,[created_group_id],(err,results) =>{
                                        if(err){console.log(err);return next(err)}
                                    })
                                    
                                    // if(socketList.sockets[user_id]) req.io.to(socketList.sockets[user_id]).emit('new-message',{
                                    //     group_id : created_group_id,username : req.user.username,message : message,sent_at : Date.now(),
                                    //     message_id : results.insertId,user_id : user_id,request:req.params.group_id
                                    // })
                                    if(socketList.sockets[group_id]) req.io.to(socketList.sockets[group_id])
                                    .emit('new-message',{
                                        group_id : created_group_id,
                                        username : req.user.username,
                                        message : message,
                                        sent_at : Date.now(),
                                        message_id : results.rows[0].message_id,
                                        user_id : user_id,
                                        request:true
                                    })
                                })
                            })
                        })
                    }
                    else if(!err){
                        
                        if(newGroups[req.user.user_id]) newGroups[user_id](created_group_id,group_id);
                        q = 'INSERT INTO requests(to_user_id,from_user_id,group_id,sent_at) VALUES($1,$2,$3,NOW())';
                        connect.query(q,[group_id,user_id,created_group_id],(err,results)=>{
                            if(err){console.log(err);}
                            if(!err){
                                q = 'SELECT * FROM images WHERE user_id=$1'
                                connect.query(q,[req.user.user_id],(err,results)=>{
                                    if(err){console.log(err);}
                                    if(socketList.sockets[group_id]) req.io.to(socketList.sockets[group_id])
                                    .emit('new-request',{
                                        group_id : created_group_id,
                                        group_user_name : req.user.username,
                                        image:results.rows[0]['image']
                                    })
                                })
                            }
                            q = `INSERT INTO messages(group_id,user_id,message,sent_at) VALUES($1,$2,$3,NOW()) RETURNING message_id`
                            connect.query(q,[created_group_id,user_id,message],(err,results) => {
                                if(err){console.log(err);return next(err)}
                                res.status(200).json({
                                    message : "message sent successfully",
                                    group_id : created_group_id,
                                    request:req.params.group_id,
                                    sendingId:req.body.sendingId,
                                    message_id:results.rows[0].message_id
                                });
                                
                                q = `UPDATE members SET lastMessage = $1 WHERE group_id = $2`
                                connect.query(q,[results.rows[0].message_id,created_group_id],(err,results) => {
                                    if(err){console.log(err);return;}
                                    q = `UPDATE members SET lastSeen=lastMessage WHERE user_id=$1 AND group_id=$2`
                                    connect.query(q,[user_id,created_group_id],(err,results)=>{if(err){console.log(err)}})
                                })
                                
                                q = 'UPDATE mgroups SET last_time = NOW() WHERE group_id = $1'
                                connect.query(q,[created_group_id],(err,results) =>{
                                    if(err){console.log(err);return next(err)}
                                })
                                // if(socketList.sockets[user_id]) req.io.to(socketList.sockets[user_id]).emit('new-message',{
                                //     group_id : created_group_id,username : req.user.username,message : message,sent_at : Date.now(),
                                //     message_id : results.insertId,user_id : user_id,request:req.params.group_id
                                // })
                                if(socketList.sockets[group_id]) req.io.to(socketList.sockets[group_id])
                                .emit('new-message',{
                                    group_id : created_group_id,
                                    username : req.user.username,
                                    message : message,
                                    sent_at : Date.now(),
                                    message_id : results.rows[0].message_id,
                                    user_id : user_id,
                                    request:true
                                })
                            })
                        })
                    }
                    
                })
            })
        })
    }
    else{
        let q = `SELECT * FROM members WHERE user_id = $1 AND group_id = $2`;
        connect.query(q,[user_id,group_id],(err,results) => {
            if(err){console.log(err);return next(err);}
            if(results.rows.length == 0){
                return res.status(404).json({message : "group not found"});
            }
            group_id = parseInt(group_id)
            let to = results.rows[0]['name_user_id'];
            q = `INSERT INTO messages(group_id,user_id,message,sent_at) VALUES($1,$2,$3,NOW()) RETURNING message_id`
            connect.query(q,[group_id,user_id,message],(err,results) => {
                if(err){console.log(err);return next(err);}
                res.status(200).json({
                    message : "message sent successfully",
                    sendingId:req.body.sendingId,
                    message_id:results.rows[0].message_id,
                    group_id:group_id
                })
                
                if(socketList.sockets[to]) req.io.to(socketList.sockets[to]).emit('new-message',{
                    group_id : group_id,
                    username : req.user.username,
                    message : message,
                    sent_at : Date.now(),
                    message_id : results.rows[0].message_id,
                    user_id : user_id
                })
                
                q = `UPDATE members SET lastMessage = $1 WHERE group_id = $2`
                connect.query(q,[results.rows[0].message_id,group_id],(err,results) => {
                    if(err){console.log(err);}
                    q = `UPDATE members SET lastSeen=lastMessage WHERE user_id=$1 AND group_id=$2`
                    connect.query(q,[user_id,group_id],(err,results)=>{if(err){console.log(err)}})
                })
                q = 'UPDATE mgroups SET last_time = NOW() WHERE group_id = $1'
                connect.query(q,[group_id],(err,results) =>{
                    if(err){console.log(err);}
                })
            })
        })
    }
})
.get(cors.corsWithOptions,auth.isAuthenticated,(req,res,next) => {
    let group_id = req.params.group_id;
    let user_id = req.user.user_id;
    let q = `SELECT * FROM members WHERE user_id = $1 AND group_id = $2`;
    connect.query(q,[user_id,group_id],(err,results) => {
        if(err){console.log(err);return next(err);}
        if(results.rows.length == 0){
            return res.status(404).json({message : "group not found"});
        }
        q = `SELECT message,message_id,sent_at,username,users.user_id,messages.group_id FROM messages JOIN 
            users ON messages.user_id = users.user_id AND messages.group_id = $1 ORDER BY sent_at ASC`
        connect.query(q,[group_id],(err,results) => {
            if(err){console.log(err);return next(err);}
            res.status(200).json(results.rows);
            
        })
    });
})



module.exports = router;