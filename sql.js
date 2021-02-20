const { Pool, Client } = require('pg');
let pool;
if(!process.env.DATABASE_URL){
  let config = require('./config');
  pool = new Pool({
    user : config.dbConfig['user'],
    host : config.dbConfig['host'],
    database : config.dbConfig['database'],
    port : config.dbConfig['port'],
    password : config.dbConfig['password'],
    ssl:{
      rejectUnauthorized : false
    },
    max : 2
  })
}
else{
  pool = new Pool({
    connectionString:process.env.DATABASE_URL,
    ssl:{
      rejectUnauthorized : false
    },
    max : 18
  })
}

let connect = pool;
connect.connect(err =>{
    console.log('connected to database');
});
module.exports = connect;