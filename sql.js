const mysql = require('mysql');
const { Pool, Client } = require('pg')
const pool = new Pool({
  // connectionString:process.env.DATABASE_URL,
  user:'yeicnhjbsrlssw',
  host:'ec2-52-22-135-159.compute-1.amazonaws.com',
  database:'dfc60jjvk97shb',
  port:5432,
  password:'38cc145125a90e996be6bf481f9ef10d6e844ea5782fbbc08e723ada08e6fb8c',
  ssl:{
    rejectUnauthorized : false
  }
})
// pool.query(' SELECT current_database()', (err, res) => {
//   console.log(err, res)
//   // pool.end()
// })


// const  connect = mysql.createPool({
//     connectionLimit : 4,
//     host : "remotemysql.com",
//     user : "sWtBMtYVs7",
//     password : "qJBb27amE4",
//     database : "sWtBMtYVs7"
  
//   });

connect = pool;
  
  // connect.connect(err =>{
  //     console.log('connected to database');
  // });

module.exports = connect;