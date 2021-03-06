var connect = require('./sql');
var socketList = require('./sockets');
var newGroups = require('./newgroups');
var jwt = require('jsonwebtoken');
var activeUsers = require('./activeUsers');

let jwtKey = '';
if(process.env.DEVELOPMENT){
    var config = require('./config');
    jwtKey =  config.jsonConfig['key'];
}
else{
    jwtKey = process.env.jwtKey;
}


function socket_io(io){
    io.on('connection',(socket)=>{
        let user_id = -1, groups = [];
        try{
            user_id = socket.handshake.session.passport.user;
        }
        catch(err){
            // console.log(err);
            try{
                if(socket.handshake.query && socket.handshake.query.token){
                    let user = jwt.verify(socket.handshake.query.token,jwtKey);
                    // console.log(user);
                    user_id = user.user_id;
                }
                // console.log(socket.handshake.query);
            }
            catch(err){
                return;
            }
        }
        newGroups[user_id] = (new_group,user_id)=>{
            groups.push({group_id: new_group,user_id : user_id});
        }
        if( socketList.sockets[user_id] ){      
            io.to(socketList.sockets[user_id]).emit('new-login-detected',{user_id : user_id});
        }
        activeUsers.activeUsers[user_id] = true;
        socketList.sockets[user_id] = socket.id;
        q = 'SELECT group_id,users.user_id FROM members JOIN users ON members.name_user_id=users.user_id WHERE members.user_id = $1';
        connect.query(q,[user_id],(err,results) => {
            if(err){console.log(err);return;}
            groups = results.rows;
        })

        socket.on('message-seen',(data) =>{
            let q = 'UPDATE members SET lastSeen = lastMessage WHERE (user_id,group_id)=($1,$2)'
            connect.query(q,[user_id,data.group_id],(err,result)=>{
                if(err){console.log("message-seen io",err); return;}
                q = `SELECT lastSeen,name_user_id FROM members WHERE (user_id,group_id)=($1,$2)`
                connect.query(q,[user_id,data.group_id],(err,results)=>{
                    if(err){console.log(err);return;}
                    if(results.rows.length === 0) return;
                    io.to(socketList.sockets[results.rows[0]['name_user_id']]).emit('update-seen',{group_id:data.group_id,lastSeen:results.rows[0]['lastseen']});
                })
            })
        })

        socket.on('voice-call',(data)=>{
            if(groups.some(group => group.group_id === data.group_id && group.user_id === data.user_id)){
                if(activeUsers.activeUsers[data.user_id] &&  socketList.sockets[data.user_id]){
                    io.to(socketList.sockets[data.user_id]).emit('voice-call-request',{user_id:user_id,group_id:data.group_id,peerId:data.peerId});
                }
            }
        })

        socket.on('voice-call-request-accept',data=>{
            if( activeUsers.activeUsers[data.user_id] && socketList.sockets[data.user_id]){
                io.to(socketList.sockets[data.user_id]).emit('call-receiver-id',{peerId:data.peerId,user_id:user_id});
            }
        })

        socket.on('answer',data=>{
            io.to(socketList.sockets[data.receiver]).emit('answer',{answer:data.answer})
        })

        socket.on('offer',(data)=>{
            io.to(socketList.sockets[data.receiver]).emit('offer',{offer:data.offer,sender:user_id,video:data.video})
        })
        socket.on('icecandidate',data=>{
            io.to(socketList.sockets[data.receiver]).emit('icecandidate',{candidate:data.candidate})
        })
        socket.on('close-call',data=>{
            if( activeUsers.activeUsers[data.receiver] && socketList.sockets[data.receiver]){
                io.to(socketList.sockets[data.receiver]).emit('close-call',{sender:user_id});
            }
        })

        socket.on('typing',data=>{
            for(i = 0; i < groups.length; ++i){
                if(groups[i].group_id === data.group_id){
                    io.to(socketList.sockets[groups[i].user_id]).emit('typing',{typer:user_id,group_id:data.group_id});
                    break;
                }
            }
        });

        socket.on('disconnect',(socket) => {
            // delete socketList.sockets[user_id];
            groups.forEach(group=>{
                if(activeUsers.activeUsers[group.user_id] && socketList.sockets[group.user_id]){
                    io.to(socketList.sockets[group.user_id]).emit('new-inactive',{user_id:user_id,group_id : group.group_id})
                }
            })
        })
    })
}


module.exports = socket_io;