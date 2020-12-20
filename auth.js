let url = 'https://turtle-chat-01.herokuapp.com';
url = 'http://localhost:3000';
const connect = require("./sql");
const axios = require('axios');
const passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth20').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy;

passport.use('google-signup', new GoogleStrategy({
  clientID : "564520619729-u3bqt4oeoj5radm6sv36j3hqk2puq9i3.apps.googleusercontent.com",
  clientSecret : "lfyJePQZuYslV32BgkxGZwbV",callbackURL : url + '/google/info'
}, (a, r, profile, done) => {
  let user = {
    google_id : profile.id,
    username : profile.displayName,
    email : profile.emails[0].value,
    firstname : profile.name.givenName,
    lastname : profile.name.familyName
  }
  let q = 'INSERT INTO users SET ?, created_at = NOW()'
  connect.query(q,user,(err,results) => {
    if(err){console.log(err);return done(err,null);}
    return done(null,{
      ...user,
      user_id : results.insertId
    });
  })
}))



passport.use('google-login', new GoogleStrategy({
  clientID : "564520619729-u3bqt4oeoj5radm6sv36j3hqk2puq9i3.apps.googleusercontent.com",
  clientSecret : "lfyJePQZuYslV32BgkxGZwbV",
  callbackURL : url + '/google/logininfo'
}, (a, r, profile, done) => {
  console.log('==============================Google Login================================');
  let q = 'SELECT * FROM users WHERE google_id = ?'
  connect.query(q,profile.id,(err,results) => {
    if(err){console.log(err);return done(new Error("Internal Error"),false);}
    if(results.length === 0){
      let error = new Error("Users not found");
      error.status = 404;
      return done(error,false);
    }
    return done(null,{
      user_id : results[0]['user_id'],
      firstname : results[0]['firstname'],
      lastname : results[0]['lastname'],
      email : results[0]['email'],
      username : results[0]['username']
    });
  })
}))

passport.use('google-signup-react', new GoogleStrategy({
  clientID : "564520619729-u3bqt4oeoj5radm6sv36j3hqk2puq9i3.apps.googleusercontent.com",
  clientSecret : "lfyJePQZuYslV32BgkxGZwbV",
  callbackURL : url + '/google-react/info'
}, (a, r, profile, done) => {
  console.log('==============================Google Signup React================================');
  let user = {
    google_id : profile.id,
    username : profile.displayName,
    email : profile.emails[0].value,
    firstname : profile.name.givenName,
    lastname : profile.name.familyName
  }
  let q = 'INSERT INTO users SET ?, created_at = NOW()'
  connect.query(q,user,(err,results) => {
    if(err){console.log(err);return done(err,null);}
    let imgUrl = profile['photos'][0].value
    axios.get(imgUrl,{responseType: 'arraybuffer'})
    .then(response=>{
      data = Buffer.from(response.data, 'binary').toString('base64');
      q = `INSERT INTO images(user_id,image) VALUES(?,?) ON DUPLICATE KEY UPDATE image=?`
      connect.query(q,[results.insertId,data,data],(err,r)=>{
        if(err) console.log(err);
      })
    });
    return done(null,{
      ...user,
      user_id : results.insertId
    });
  })
}))

passport.use('google-login-react', new GoogleStrategy({
  clientID : "564520619729-u3bqt4oeoj5radm6sv36j3hqk2puq9i3.apps.googleusercontent.com",
  clientSecret : "lfyJePQZuYslV32BgkxGZwbV",
  callbackURL : url + '/google-react/logininfo'
}, (a, r, profile, done) => {
  console.log('==============================Google Login React================================');
  let q = 'SELECT * FROM users WHERE google_id = ?'
  connect.query(q,profile.id,(err,results) => {
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
      q = `INSERT INTO images(user_id,image) VALUES(?,?) ON DUPLICATE KEY UPDATE image=?`
      connect.query(q,[results[0]['user_id'],data,data],(err,r)=>{
        if(err) console.log(err);
      })
    });

    return done(null,{
      user_id : results[0]['user_id'],
      firstname : results[0]['firstname'],
      lastname : results[0]['lastname'],
      email : results[0]['email'],
      username : results[0]['username']
    });
  })
}))

passport.use('facebook-signup-react',new FacebookStrategy({
  clientID : "871810780255994",
  clientSecret : "2846c0a6c3e45841ad2973201fd6a1d3",
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
    lastname : profile.name.familyName,
  }
  let q = 'INSERT INTO users SET ?, created_at = NOW()'
  connect.query(q,user,(err,results) => {
    if(err){console.log(err);return done(err,null);}
    let imgUrl = profile['photos'][0].value
    axios.get(imgUrl,{responseType: 'arraybuffer'})
    .then(response=>{
      data = Buffer.from(response.data, 'binary').toString('base64');
      q = `INSERT INTO images(user_id,image) VALUES(?,?) ON DUPLICATE KEY UPDATE image=?`
      connect.query(q,[results.insertId,data,data],(err,r)=>{
        if(err) console.log(err);
      })
    });
    return done(null,{
      ...user,
      user_id : results.insertId
    });
  })
}))

passport.use('facebook-login-react',new FacebookStrategy({
  clientID : "871810780255994",
  clientSecret : "2846c0a6c3e45841ad2973201fd6a1d3",
  callbackURL : url + '/facebook-react/logininfo',
  profileFields: ['id', 'displayName', 'name', 'gender', 'picture.type(normal)']
},(a, r, profile, done) => {
  console.log('==============================Facebook Login React================================');
  let q = 'SELECT * FROM users WHERE facebook_id = ?'
  connect.query(q,profile.id,(err,results) => {
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
      q = `INSERT INTO images(user_id,image) VALUES(?,?) ON DUPLICATE KEY UPDATE image=?`
      connect.query(q,[results[0]['user_id'],data,data],(err,r)=>{
        if(err) console.log(err);
      })
    });
    return done(null,{
      user_id : results[0]['user_id'],
      firstname : results[0]['firstname'],
      lastname : results[0]['lastname'],
      email : results[0]['email'],
      username : results[0]['username']
    });
  })
}))


passport.serializeUser(function(user, cb) {
  cb(null, user.user_id);
});

passport.deserializeUser(function(id, cb) {
  let q = 'SELECT * FROM users WHERE user_id = ?';
  connect.query(q,[id],(err,results) =>{
    if(err){
      console.log(err)
      return cb(err);
    }
    if(!results) return cb(new Error("invalid cookie"));
    cb(null,results[0]);
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
