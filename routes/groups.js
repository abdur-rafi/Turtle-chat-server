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
    let user_id = req.user.user_id;
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
                results.rows[i]['bold'] = false;
                if(results.rows[i]['lastmessageid'] !== results.rows[i]['userlastseen']){
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
                    q = `SELECT members.user_id, users.username,images.image
                        FROM members
                        JOIN users ON users.user_id = members.user_id
                        JOIN images ON images.user_id = members.user_id
                        WHERE group_id = $1`;
                    let index = i;
                    connect.query(q,[results.rows[index]['group_id']],(err,result)=>{
                        if(err){console.log(err);return next(err)}
                        results.rows[index]['group_members'] = result.rows;
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
    if(!req.body.group_name || !req.body.group_image){
        res.status(400).json({message : "group_name or image is not set"});
        return;
    }
    let q = 'SELECT * FROM createGroup($1,$2,$3)'
    connect.query(q,[req.user.user_id,req.body.group_name,req.body.group_image],(err,result)=>{
        if(err){console.log(err);return next(err)}
        res.status(200).json({
            group : {
            ...result.rows[0],
            image : req.body.group_image,
            group_members : [{
                user_id : req.user.user_id,
                username : req.user.username,
                image : result.rows[0]['image']
            }]
        }})
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
    if(req.user.user_id === parseInt(req.params.group_id)){
        res.status(400).json({
            message : "invalid request"
        });
        return;
    }
    let group_id = req.params.group_id;
    let user_id = req.user.user_id;
    if((typeof(group_id) === "string" && group_id.substring(0,7)==='request') || parseInt(group_id) < 0){
        console.log("here")
        if( group_id.substring(0,7)==='request'){
            group_id = group_id.substring(7);
            group_id = parseInt(group_id);
        }
        else{
            console.log(group_id, "type", typeof(group_id))
            group_id = parseInt(group_id);
            group_id = (-1) * group_id;
        }

        console.log( "grou[_id", group_id);
        console.log("user_id",req.user.user_id);
        
        q = `SELECT * FROM createGroupInsertMessage($1,$2,$3)`
        connect.query(q,[user_id,group_id,message],(err,result)=>{
            if(err){console.log(err);return next(err)}
            let created_group_id = result.rows[0]['new_group_id_'];
            let image = result.rows[0]['image_']
            let lastmessageid = result.rows[0]['message_id_']
            if(newGroups[req.user.user_id]) newGroups[user_id](created_group_id,group_id);
            if(socketList.sockets[group_id]){ 
                req.io.to(socketList.sockets[group_id])
                .emit('new-request',{
                    group_id : created_group_id,
                    group_user_name : req.user.username,
                    name_user_id : req.user.user_id,
                    image: image,
                    last_message_user_id : req.user.user_id,
                    last_time : Date.now(),
                    lastmessageid : lastmessageid,
                    lastseen : null,
                    message : message,
                    req : 1,
                    userlastseen : null
                })
            }
            res.status(200).json({
                message : "message sent successfully",
                group_id : created_group_id,
                request:req.params.group_id,
                sendingId:req.body.sendingId,
                message_id:lastmessageid
            });
        }); 
    }
    else{
        group_id = parseInt(req.params.group_id);
        let q = `SELECT * FROM insertMessage($1,$2,$3)`
        connect.query(q,[user_id,group_id,message],(err,result)=>{
            if(err){console.log(err);return next(err)}
            let message_id = result.rows[0]['message_id_'];
            let name_user_id = result.rows[0]['name_user_id_'];
            res.status(200).json({
                message : "message sent successfully",
                sendingId:req.body.sendingId,
                message_id:message_id,
                group_id:group_id
            })
            let message_io = {
                group_id : group_id,
                username : req.user.username,
                message : message,
                sent_at : Date().toString(),
                message_id : message_id,
                user_id : user_id
            }
            let isGroup = result.rows[0]['req_'] === 2;
            console.log(isGroup);
            if(!isGroup){
                if(socketList.sockets[name_user_id]) req.io.to(socketList.sockets[name_user_id]).emit('new-message',message_io)
            }
            else{
                q = `SELECT user_id FROM members WHERE group_id = $1 AND user_id != $2`
                connect.query(q,[group_id,req.user.user_id],(err,result)=>{
                    if(err){console.log(err);return next(err)}
                    result.rows.forEach(row=>{
                        if(socketList.sockets[row['user_id']]){
                            req.io.to(socketList.sockets[row['user_id']]).emit('new-message',message_io);
                        }
                    });
                })
            }

        })
    }
})
.get(cors.corsWithOptions,auth.isAuthenticated,(req,res,next) => {
    let group_id = req.params.group_id;
    let user_id = req.user.user_id;
    let q = 'SELECT * FROM getMessages($1,$2)'
    connect.query(q,[user_id,group_id],(err,result)=>{
        if(err){console.log(err);return next(err)}
        res.status(200).json(result.rows);
    })
    
})
router.route('/:group_id/addmembers')
.options(cors.corsWithOptions,(req,res) => {res.sendStatus(200);})
.post(cors.corsWithOptions,auth.isAuthenticated,(req,res,next)=>{
    if(!req.body.new_members || req.body.new_members.length === 0){
        res.status(400).json({message : "no member was selected"});
        return;
    }
    let q = 'SELECT * FROM addMemberToGroup($1::int,$2::int,($3)::int[],$4::int,$5::mytype[])'
    let new_members = req.body.new_members;
    let new_members_str = '{';
    for(let i=0 ;i < new_members.length;++i){
        new_members_str += `"(${new_members[i]},${req.params.group_id},${123123},${2})"`
        if(i != new_members.length-1) new_members_str +=',';
    }
    new_members_str += '}'
    console.log(new_members_str);
    connect.query(q,[req.user.user_id,req.params.group_id,new_members,new_members.length,new_members_str]
        ,(err,result)=>{
            if(err){console.log(err);return next(err)}
            let all_members_id = result.rows[0]['all_members_id_'];
            let all_members_username = result.rows[0]['all_members_username_']
            let all_members_image = result.rows[0]['all_members_image_'];
            let old_members = result.rows[0]['old_members_'];
            let group_members = []
            for(let i = 0;i < all_members_id.length;++i){
                group_members.push({
                    user_id : all_members_id[i],
                    username : all_members_username[i],
                    image : all_members_image[i]
                })
            }
            let group = {
                active : false,
                bold : true,
                group_id : parseInt(req.params.group_id),
                group_name : null,
                group_user_name : result.rows[0]['group_user_name_'],
                image : result.rows[0]['image_'],
                last_message_user_id : result.rows[0]['image'],
                last_time : result.rows[0]['sent_at_'],
                lastmessageid : result.rows[0]['last_message_id_'],
                lastSeen : null,
                message : result.rows[0]['last_message_'],
                name_user_id : result.rows[0]['name_user_id_'],
                req : 2,
                userlastSeen : null,
                group_members : group_members
            }
            res.status(200).json({group_members: group_members});
            old_members.forEach(member =>{
                if(socketList.sockets[member]){
                    req.io.to(socketList.sockets[member]).emit('update-group-members',{
                        group_members: group_members,
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



module.exports = router;