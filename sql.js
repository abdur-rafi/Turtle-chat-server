const mysql = require('mysql');
const { Pool, Client } = require('pg');
// const { connect } = require('./routes/users');
let pool;
if(!process.env.DATABASE_URL){
  // console.log("pool created with credentials");
  pool = new Pool({
    user:'yeicnhjbsrlssw',
    host:'ec2-52-22-135-159.compute-1.amazonaws.com',
    database:'dfc60jjvk97shb',
    port:5432,
    password:'38cc145125a90e996be6bf481f9ef10d6e844ea5782fbbc08e723ada08e6fb8c',
    ssl:{
      rejectUnauthorized : false
    },
    max : 2
  })
}
else{
  // console.log("pool with database url", process.env.PRODUNCTION);
  pool = new Pool({
    connectionString:process.env.DATABASE_URL,
    // user:'yeicnhjbsrlssw',
    // host:'ec2-52-22-135-159.compute-1.amazonaws.com',
    // database:'dfc60jjvk97shb',
    // port:5432,
    // password:'38cc145125a90e996be6bf481f9ef10d6e844ea5782fbbc08e723ada08e6fb8c',
    ssl:{
      rejectUnauthorized : false
    },
    max : 18
  })
}

let insertMessageFunction = 
  `CREATE OR REPLACE FUNCTION insertMessage(user_id_ integer,group_id_ integer, message_ text) 
  RETURNS integer AS $message_id_$
  DECLARE
    message_id_ integer;
    group_found integer;
  BEGIN
    SELECT COUNT(*) INTO group_found FROM members WHERE user_id = user_id_ AND group_id = group_id_;
    IF group_found != 0 THEN
    INSERT INTO messages(group_id,user_id,message,sent_at) VALUES(group_id_,user_id_,message_,NOW()) RETURNING message_id INTO message_id_;
    UPDATE members SET lastMessage = message_id_ WHERE group_id = group_id_;
    UPDATE members SET lastSeen=lastMessage WHERE user_id=user_id_ AND group_id=group_id_;
    UPDATE mgroups SET last_time = NOW() WHERE group_id = group_id_;
    ELSE
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
    RETURN message_id_; 
  END;
  $message_id_$ LANGUAGE plpgsql;
  `

insertMessageFunction = 
  `CREATE OR REPLACE FUNCTION insertMessage(user_id_ integer,group_id_ integer, message_ text, OUT message_id_ integer, OUT name_user_id_ integer)
  AS $result$ 
  DECLARE
    group_found integer[];
    length integer;
  BEGIN
    SELECT Array(SELECT members.name_user_id FROM members WHERE user_id = user_id_ AND group_id = group_id_) as group_found_ INTO group_found ;
    SELECT array_length(group_found,1) INTO length;
    IF length != 0 THEN
      name_user_id_ := group_found[1];
      INSERT INTO messages(group_id,user_id,message,sent_at) VALUES(group_id_,user_id_,message_,NOW()) RETURNING message_id INTO message_id_;
      UPDATE members SET lastMessage = message_id_ WHERE group_id = group_id_;
      UPDATE members SET lastSeen=lastMessage WHERE user_id=user_id_ AND group_id=group_id_;
      UPDATE mgroups SET last_time = NOW() WHERE group_id = group_id_;
    ELSE
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
  END;
  $result$ LANGUAGE plpgsql;
  `

let connect = pool;
connect.query(insertMessageFunction, (err,res)=>{
    console.log(err,res);
    // connect.query(`SELECT * FROM insertMessage(70,65,'asdajsdj askd kj')`,(err,res)=>{
    //   console.log(err,res);
    // })
  })

  connect.connect(err =>{
      console.log('connected to database');
  });


module.exports = connect;