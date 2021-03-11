require('dotenv').config()
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cookieSession = require('cookie-session');
var passport = require('passport');
var socketio = require("socket.io");
// routes
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var notificationRouter = require('./routes/notifications');
var groupRouter = require('./routes/groups');
var requestRouter = require('./routes/requests');
var facebookReactRouter = require('./routes/facebook-react');
var googleReactRouter = require('./routes/google-react');
var googleReactNativeRouter = require('./routes/google-react-native');
var facebookReactNativeRouter = require('./routes/facebook-react-native');
var app = express();
var io = socketio();
app.io = io;
app.disable('etag');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


let keys = [];

if(process.env.DEVELOPMENT){
  let config = require('./config');
  keys = [config.sessionKeyConfig['key1'],config.sessionKeyConfig['key2']]
}
else{
  keys = [process.env.session_key_1,process.env.session_key_2]
}

var sess = {
  name : 'turtle-chat-01',
  maxAge: 12 * 1000 * 60 * 60 ,
  expires: 12 * 1000 * 60 * 60,
  keys : keys
}

 
var cookieConfig = {
  ...sess
}
if(!process.env.DEVELOPMENT){
  app.set('trust proxy', 1);
  cookieConfig = {
    ...cookieConfig,
    sameSite : "none",
    secure:true
  }
}

var session = cookieSession(cookieConfig); 
app.use(session);
app.use(passport.initialize()); 
app.use(passport.session());

io.use(function(socket,next){
  var req = socket.handshake;
    var res = {};
    cookieParser()(req, res, function(err) {
        if (err) return next(err);
        session(req, res, next);
    });
})

var config_io = require('./io');
config_io(io);
app.use((req,res,next) => {
  req.io = io;
  next();
})

// mounting ROUTERS

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/notifications',notificationRouter);
app.use('/groups',groupRouter);
app.use('/google-react',googleReactRouter);
app.use('/google-react-native',googleReactNativeRouter);
app.use('/requests',requestRouter);
app.use('/facebook-react',facebookReactRouter);
app.use('/facebook-react-native',facebookReactNativeRouter);
app.use(express.static(path.join(__dirname, 'public')));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
