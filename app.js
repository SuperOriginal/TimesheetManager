var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var creds = require('./credentials.json');
var passport = require('passport');
var favicon = require('serve-favicon');

var index = require('./routes/index');
var auth = require('./routes/auth')(passport);
var api = require('./routes/api');

var app = express();

var session = require('express-session');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'pencil.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(creds.sessionSecret));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/modules', express.static(__dirname + '/node_modules/'));

//Passport initialization
var sessionOpts = {
  secret: creds.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    //one week
    maxAge: 604800000
  }
}

app.use(session(sessionOpts));
app.use(passport.initialize());
app.use(passport.session());

require('./googleauth.js')(passport);

//Routes for index, authentication, and API
app.use('/', index);
app.use('/auth', auth);
app.use('/api', api);

//catch-all function to reroute user to index
//this fixes refresh 404 errors
app.use(function(req, res) {
  //pass the requested path to the client so angular can handle it instead of the server
  res.redirect('/#' + req.url);
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
