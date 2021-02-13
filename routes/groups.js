var express = require('express');
var router = express.Router();
var connect = require('../sql');
var bcrypt = require('bcryptjs');
var passport = require('passport');
var auth = require('../auth');
var cors = require('../cors');
var socketList = require('../sockets');
var newGroups = require('../newgroups');
var format = require('pg-format');

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
        let done = [];
        let loopComplete = false;
        let response_sent = false;
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
                // console.log(results.rows[i]);
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
                if(results.rows[i]['req'] === 2){
                    done.push(i);
                    // console.log(done);
                    q = `SELECT members.user_id, users.username,images.image
                        FROM members
                        JOIN users ON users.user_id = members.user_id
                        JOIN images ON images.user_id = members.user_id
                        WHERE group_id = $1`;
                    let index = i;
                    connect.query(q,[results.rows[index]['group_id']],(err,result)=>{
                        if(err){console.log(err);return next(err)}
                        // console.log("results[i].rows =",i);
                        results.rows[index]['group_members'] = result.rows;
                        // console.log(result.rows);
                        // console.log(done);
                        done = done.filter(ind => ind !== index);
                        if(loopComplete && done.length === 0 && !response_sent){
                            response_sent = true;
                            res.status(200).json({
                                groups:results.rows,
                                user:user
                            });
                        }
                    })
                }
                
            }
            loopComplete = true;
            let user = {
                user_id:req.user.user_id,
                username:req.user.username,
                image:img
            }
            // console.log("done.length = ",done.length)
            if(done.length === 0 && !response_sent){
                response_sent = true;
                res.status(200).json({
                    groups:results.rows,
                    user:user
                });
            }
            
        })
        
    })
})

router.route('/newgroup')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.post(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
    // console.log("here");
    // console.log(req.body);
    if(!req.body.group_name || !req.body.group_image){
        res.status(400).json({message : "group_name of image is not set"});
        return;
    }
    let q = `INSERT INTO users(username,created_at,type) VALUES($1,NOW(),1) RETURNING user_id`
    connect.query(q,[req.body.group_name],(err,result)=>{
        if(err){console.log(err);return next(err)}
        let new_user_id = result.rows[0]['user_id']; 
        q = `INSERT INTO images(user_id,image) VALUES($1,$2)`
        connect.query(q,[new_user_id,req.body.group_image],(err,result)=>{
            if(err){console.log(err);return next(err)}
            q = `INSERT INTO mgroups(created_at) VALUES(NOW()) RETURNING group_id`
            connect.query(q,(err,result)=>{
                if(err){console.log(err);return next(err)}
                let new_group_id = result.rows[0]['group_id'];
                q = `INSERT INTO members(user_id,group_id,name_user_id,req) VALUES($1,$2,$3,2)`
                connect.query(q,[req.user.user_id,new_group_id,new_user_id],(err,result)=>{
                    if(err){console.log(err);return next(err)}
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
                            members.user_id = $1 AND members.group_id = $2`
                        connect.query(q,[req.user.user_id,new_group_id],(err,result)=>{
                            let group = result.rows[0];
                            q = 'SELECT image FROM images WHERE user_id = $1'
                            connect.query(q,[req.user.user_id],(err,result)=>{
                                if(err){console.log(err);return next(err)}
                                
                                res.status(200).json({group : {...group,group_members:[{
                                    user_id : req.user.user_id,
                                    username : req.user.username,
                                    image : result.rows[0]['image']
                                }]}})
                            })
                            
                        })
                })
            })
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
                            connect.query(q,[group_id,user_id,created_group_id],(err_req,results)=>{
                                if(err_req){console.log("req insert error",err_req)}
                                q = `INSERT INTO messages(group_id,user_id,message,sent_at) VALUES($1,$2,$3,NOW()) RETURNING message_id`
                                connect.query(q,[created_group_id, user_id,message],(err,results) => {
                                    if(!err_req){
                                        q = 'SELECT * FROM images WHERE user_id=$1'
                                        connect.query(q,[req.user.user_id],(err,result)=>{
                                            if(err){console.log("sel img error",err);}
                                            if(socketList.sockets[group_id]) req.io.to(socketList.sockets[group_id])
                                            .emit('new-request',{
                                                group_id : created_group_id,
                                                group_user_name : req.user.username,
                                                name_user_id : req.user.user_id,
                                                image:result.rows[0]['image'],
                                                last_message_user_id : req.user.user_id,
                                                last_time : Date.now(),
                                                lastmessageid : results.rows[0].message_id,
                                                lastseen : null,
                                                message : message,
                                                req : 1,
                                                userlastseen : null
                                            })
                                        })
                                    }
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
                        connect.query(q,[group_id,user_id,created_group_id],(err_req,results)=>{
                            if(err_req){console.log(err_req);}
                            // if(!err){
                            //     q = 'SELECT * FROM images WHERE user_id=$1'
                            //     connect.query(q,[req.user.user_id],(err,results)=>{
                            //         if(err){console.log(err);}
                            //         if(socketList.sockets[group_id]) req.io.to(socketList.sockets[group_id])
                            //         .emit('new-request',{
                            //             group_id : created_group_id,
                            //             group_user_name : req.user.username,
                            //             image:results.rows[0]['image']
                            //         })
                            //     })
                            // }
                            q = `INSERT INTO messages(group_id,user_id,message,sent_at) VALUES($1,$2,$3,NOW()) RETURNING message_id`
                            connect.query(q,[created_group_id,user_id,message],(err,results) => {
                                if(err){console.log(err);return next(err)}
                                if(!err_req){
                                    q = 'SELECT * FROM images WHERE user_id=$1'
                                    connect.query(q,[req.user.user_id],(err,result)=>{
                                        if(err){console.log("sel img error",err);}
                                        if(socketList.sockets[group_id]) req.io.to(socketList.sockets[group_id])
                                        .emit('new-request',{
                                            group_id : created_group_id,
                                            group_user_name : req.user.username,
                                            name_user_id : req.user.user_id,
                                            image:result.rows[0]['image'],
                                            last_message_user_id : req.user.user_id,
                                            last_time : Date.now(),
                                            lastmessageid : results.rows[0].message_id,
                                            lastseen : null,
                                            message : message,
                                            req : 1,
                                            userlastseen : null
                                        })
                                    })
                                }
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
            let isGroup = results.rows[0]['req'] === 2;
            console.log("isGroup",isGroup);
            // console.log("message query", results);
            q = `INSERT INTO messages(group_id,user_id,message,sent_at) VALUES($1,$2,$3,NOW()) RETURNING message_id`
            connect.query(q,[group_id,user_id,message],(err,results) => {
                if(err){console.log(err);return next(err);}
                res.status(200).json({
                    message : "message sent successfully",
                    sendingId:req.body.sendingId,
                    message_id:results.rows[0].message_id,
                    group_id:group_id
                })
                let message_io = {
                    group_id : group_id,
                    username : req.user.username,
                    message : message,
                    sent_at : Date.now(),
                    message_id : results.rows[0].message_id,
                    user_id : user_id
                }
                if(!isGroup){
                    if(socketList.sockets[to]) req.io.to(socketList.sockets[to]).emit('new-message',message_io)
                }
                else{
                    q = `SELECT user_id FROM members WHERE group_id = $1 AND user_id != $2`
                    connect.query(q,[group_id,req.user.user_id],(err,result)=>{
                        if(err){console.log(err);return next(err)}
                        console.log(result);
                        result.rows.forEach(row=>{
                            if(socketList.sockets[row['user_id']]){
                                req.io.to(socketList.sockets[row['user_id']]).emit('new-message',message_io);
                            }
                        });
                    })
                }
                    
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
router.route('/:group_id/addmembers')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.post(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
    if(!req.body.new_members || req.body.new_members.length === 0){
        res.status(400).json({message : "no member was selected"});
        return;
    }
    let q = `SELECT * FROM members WHERE user_id = $1 AND group_id = $2`;
    connect.query(q,[req.user.user_id,req.params.group_id],(err,result)=>{
        if(err){console.log(err);return next(err)}
        if(result.rows.length === 0){
            res.status(401).json({message : "unauthorized"});
            return;
        }
        let name_user_id = result.rows[0]['name_user_id'];
        let new_members = req.body.new_members;
        // console.log(new_members)
        q = format('SELECT * FROM members WHERE user_id = $1 AND req != 2 AND name_user_id IN (%L)',new_members);
        // console.log(q);
        connect.query(q,[req.user.user_id],(err,result)=>{
            if(err){console.log(err);return next(err)}
            if(result.rows.length !== new_members.length){
                res.status(401).json({message : "unauthorized"});
                return;
            }
            q = format('SELECT * FROM members WHERE group_id = $1 AND user_id IN (%L)',new_members);
            connect.query(q,[parseInt(req.params.group_id)],(err,result)=>{
                if(err){console.log(err);return next(err)}
                if(result.rows.length !== 0){
                    res.status(400).json({"message" : "some selecred members are already added"});
                    return;
                }
                q = 'SELECT * FROM messages WHERE group_id = $1 ORDER BY sent_at DESC LIMIT 1';
                connect.query(q,[req.params.group_id],(err,result)=>{
                    if(err){console.log(err);return next(err)}
                    let lastMessageId = result.rows.length !== 0 ? result.rows[0]['message_id'] : null;
                    let lastMessageSenderId = result.rows.length !== 0 ? result.rows[0]['user_id'] : null;
                    let lastSeen = result.rows.length !== 0 ? result.rows[0]['sent_at'] : null;
                    let message = result.rows.length !== 0 ? result.rows[0]['message'] : null
                    let values = new_members.map(member=>[member,req.params.group_id,name_user_id,lastMessageId,2]);
                    q = `SELECT * FROM users 
                            JOIN images
                            ON images.user_id = users.user_id 
                            WHERE users.user_id = $1`
                    connect.query(q,[name_user_id],(err,result)=>{
                        if(err){console.log("join image", err);return next(err)} 
                        let group_user_name = result.rows[0]['username'];   
                        let image = result.rows[0]['image'];             
                        q = 'SELECT user_id FROM members WHERE group_id = $1 AND user_id != $2';
                        connect.query(q,[parseInt(req.params.group_id),req.user.user_id],(err,result)=>{
                            if(err){console.log(err);return next(err)}
                            let old_members = result.rows;
                            q = format('INSERT INTO members(user_id,group_id,name_user_id,lastMessage,req) VALUES %L',values);
                            console.log(q);
                            connect.query(q,(err,result)=>{
                                if(err){console.log(err);return next(err)}

                                q = `SELECT members.user_id, users.username,images.image
                                    FROM members
                                    JOIN users ON users.user_id = members.user_id
                                    JOIN images ON images.user_id = members.user_id
                                    WHERE group_id = $1`;
                                connect.query(q,[parseInt(req.params.group_id)],(err,result)=>{
                                    if(err){console.log(err);return next(err)}
                                    let group = {
                                        active : false,
                                        bold : false,
                                        group_id : parseInt(req.params.group_id),
                                        group_name : null,
                                        group_user_name : group_user_name,
                                        image : image,
                                        last_message_user_id : lastMessageSenderId,
                                        last_time : lastSeen,
                                        lastmessageid : lastMessageId,
                                        lastSeen : null,
                                        message : message,
                                        name_user_id : name_user_id,
                                        req : 2,
                                        userlastSeen : null,
                                        group_members : result.rows
                                    }
                                    res.status(200).json({group_members: result.rows});
                                    old_members.forEach(member =>{
                                        if(socketList.sockets[member]){
                                            req.io.to(socketList.sockets[member]).emit('update-group-members',{
                                                group_members:result.rows,
                                                group_id : parseInt(req.params.group_id)
                                            });
                                        }
                                    })
                                    new_members.forEach(member=>{
                                        if(socketList.sockets[member]){
                                            req.io.to(socketList.sockets[member]).emit('new-group',group);
                                        }
                                    })
                                })
                                
                            })
                        })    
                        
                        
                    })
                })
            })
                
            // console.log(result);
        })
    })
    

})



module.exports = router;