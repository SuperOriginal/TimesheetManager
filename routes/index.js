var express = require('express');
var router = express.Router();
var google = require('googleapis');
var fs = require('fs');
var creds = require('../credentials.json');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Timesheet' });
});

var OAuth2 = google.auth.OAuth2;

var oauth2Client = new OAuth2(creds.clientid, creds.secret, creds.redirecturl);

var scopes = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive.metadata']

var accessurl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
  scope: scopes
});

/* GET authentication key from Google. */
router.get('/url', function(req, res, next) {
  res.send(accessurl);
});

router.get('/oauthcallback', function(req, res, next) {
  res.render('oauthcallback', {title: "Timesheet"});
});

/* GET access token using auth key. */
router.get('/tokens', function(req, res, next) {
  var code = req.query.code;
  oauth2Client.getToken(code, function(err, tokens) {
    if (err) {
      res.send(null);
      return;
    }
    oauth2Client.setCredentials(tokens);
    res.send(tokens);
  });
});

router.get('/manager', function(req,res,next){
  res.render('manager', {title: "Timesheet"});
  //handle url parsing here
});

router.post('/findSheet', function(req,res,next){
  console.log("client to server got " + req.body.url);
  //handle url parsing here
});

module.exports = router;
