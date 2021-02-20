require('dotenv').config();
let url = 'https://turtle-chat-server.herokuapp.com';
if(process.env.DEVELOPMENT === 'TRUE'){
  url = 'http://localhost:3000';
}
const connect = require("./sql");
const axios = require('axios');
const passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth20').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy

let googleConfig = {}, facebookConfig = {};
if(process.env.DEVELOPMENT){
  let config = require('./config');
  googleConfig = {
    ...config.googleConfig
  }
  facebookConfig = {
    ...config.facebookConfig
  }
}
else{
  googleConfig = {
    clientID : process.env.googleClientId,
    clientSecret : process.env.googleClientSecret
  }
  facebookConfig = {
    clientID : process.env.facebookClientId,
    clientSecret : process.env.facebookClientSecret
  }
}


passport.use('google-signup-react', new GoogleStrategy({
  ...googleConfig,
  callbackURL : url + '/google-react/info'
}, (a, r, profile, done) => {
  console.log('==============================Google Signup React================================');
  let user = [
    profile.id,
    profile.displayName,
    profile.emails[0].value,
    profile.name.givenName,
    profile.name.familyName
  ]
  let q = `INSERT INTO users(google_id,username,email,firstname,lastname,created_at) 
      VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING user_id`
  connect.query(q,user,(err,results) => {
    if(err){console.log(err);return done(err,null);}
    let imgUrl = profile['photos'][0].value
    axios.get(imgUrl,{responseType: 'arraybuffer'})
    .then(response=>{
      data = Buffer.from(response.data, 'binary').toString('base64');
      q = `INSERT INTO images(user_id,image) VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET image = ($2)`
      
      connect.query(q,[results.rows[0].user_id,data],(err,r)=>{
        if(err) console.log(err);
      })
    });
    return done(null,{
      ...user,
      user_id : results.rows[0].user_id
    });
  })
}))

passport.use('google-login-react', new GoogleStrategy({
  ...googleConfig,
  callbackURL : url + '/google-react/logininfo'
}, (a, r, profile, done) => {
  console.log('==============================Google Login React================================');
  let q = 'SELECT * FROM users WHERE google_id = $1'
  connect.query(q,[profile.id],(err,results) => {
    if(err){console.log(err);return done(new Error("Internal Error"),false);}
    if(results.rows.length === 0){
      let error = new Error("Users not found");
      error.status = 404;
      return done(error,false);
    }
    let imgUrl = profile['photos'][0].value
    axios.get(imgUrl,{responseType: 'arraybuffer'})
    .then(response=>{
      data = Buffer.from(response.data, 'binary').toString('base64');
      q = `INSERT INTO images(user_id,image) VALUES(?,?) ON CONFLICT (user_id) DO UPDATE SET image = ($2)`
      connect.query(q,[results.rows[0]['user_id'],data],(err,r)=>{
        if(err) console.log(err);
      })
    });

    return done(null,{
      user_id : results.rows[0]['user_id'],
      firstname : results.rows[0]['firstname'],
      lastname : results.rows[0]['lastname'],
      email : results.rows[0]['email'],
      username : results.rows[0]['username']
    });
  })
}))

passport.use('facebook-signup-react',new FacebookStrategy({
  ...facebookConfig,
  callbackURL : url + '/facebook-react/info',
  profileFields: ['id', 'displayName', 'name', 'gender', 'picture.type(normal)']
},(a, r, profile, done) => {
  console.log('==============================Facebook Signup React================================');
  var email = null;
  try{
    email = profile.emails[0].value
  } catch(err){
    console.log(err);
  }
  let user = {
    facebook_id : profile.id,
    username : profile.displayName,
    email : email,
    firstname : profile.name.givenName,
    lastname : profile.name.familyName
  }
  let q = `INSERT INTO users(facebook_id,username,email,firstname,lastname,created_at) 
        VALUES($1,$2,$3,$4,$5,NOW()) RETURNING user_id`
  connect.query(q,[profile.id,profile.displayName,email,profile.name.givenName,profile.name.familyName],(err,results) => {
    if(err){console.log(err);return done(err,null);}
    let imgUrl = profile['photos'][0].value
    axios.get(imgUrl,{responseType: 'arraybuffer'})
    .then(response=>{
      data = Buffer.from(response.data, 'binary').toString('base64');
      q = `INSERT INTO images(user_id,image) VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET image = ($2)`
      connect.query(q,[results.rows[0]['user_id'],data],(err,r)=>{
        if(err) console.log(err);
      })
    });
    return done(null,{
      ...user,
      user_id : results.rows[0]['user_id']
    });
  })
}))

passport.use('facebook-login-react',new FacebookStrategy({
  ...facebookConfig,
  callbackURL : url + '/facebook-react/logininfo',
  profileFields: ['id', 'displayName', 'name', 'gender', 'picture.type(normal)']
},(a, r, profile, done) => {
  console.log('==============================Facebook Login React================================');
  let q = 'SELECT * FROM users WHERE facebook_id = $1'
  connect.query(q,[profile.id],(err,results) => {
    if(err){console.log(err);return done(new Error("Internal Error"),false);}
    if(results.length === 0){
      let error = new Error("Users not found");
      error.status = 404;
      return done(error,false);
    }
    let imgUrl = profile['photos'][0].value
    axios.get(imgUrl,{responseType: 'arraybuffer'})
    .then(response=>{
      data = Buffer.from(response.data, 'binary').toString('base64');
      q = `INSERT INTO images(user_id,image) VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET image = ($2)`
      connect.query(q,[results[0]['user_id'],data],(err,r)=>{
        if(err) console.log(err);
      })
    });
    return done(null,{
      user_id : results.rows[0]['user_id'],
      firstname : results.rows[0]['firstname'],
      lastname : results.rows[0]['lastname'],
      email : results.rows[0]['email'],
      username : results.rows[0]['username']
    });
  })
}))


passport.serializeUser(function(user, cb) {
  cb(null, user.user_id);
});

passport.deserializeUser(function(id, cb) {
  let q = 'SELECT * FROM users WHERE user_id = $1';
  connect.query(q,[id],(err,results) =>{
    if(err){
      console.log(err)
      return cb(err);
    }
    if(!results) return cb(new Error("invalid cookie"));
    cb(null,results.rows[0]);
  })
});

const isAuthenticated = (req, res, next) => {
  if (req.user) {
    return next();
  }
  res.statusCode = 401;
  res.setHeader('Content-Type', 'text');
  res.end("You are Not authorized")
};

module.exports = {isAuthenticated};
