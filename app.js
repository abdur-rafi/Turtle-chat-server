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
var googleRouter = require('./routes/google');
var requestRouter = require('./routes/requests');
var facebookRouter = require('./routes/facebook');
var facebookReactRouter = require('./routes/facebook-react');
var googleReactRouter = require('./routes/google-react');


var connect = require('./sql');
const auth = require('./auth');
var app = express();
var io = socketio();
app.io = io;


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());




var sess = {
  name : 'turtle-chat-01',
  maxAge: 4 * 1000 * 60 * 60 ,
  expires: 4 * 1000 * 60 * 60,
  keys : ['lN9U-6f%yXoi2|zayO!5|^Z8','aV67cxJLQjUmbivK'],
  secure:true
  // secret : "Keyboard Cat"
}
 
// if (app.get('env') === 'production') {
//   app.set('trust proxy', 1) // trust first proxy
//   sess.secure = true // serve secure cookies
// }
app.set('trust proxy', 1) 
var session = cookieSession({...sess, sameSite:"none"});
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
app.use('/google',googleRouter);
app.use('/google-react',googleReactRouter);
app.use('/requests',requestRouter);
app.use('/facebook',facebookRouter);
app.use('/facebook-react',facebookReactRouter);
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
