const mysql = require('mysql');

const  connect = mysql.createPool({
    connectionLimit : 4,
    host : "remotemysql.com",
    user : "sWtBMtYVs7",
    password : "qJBb27amE4",
    database : "sWtBMtYVs7"
  
  });
  
  // connect.connect(err =>{
  //     console.log('connected to database');
  // });

module.exports = connect;