var express = require('express');
var router = express.Router();
var google = require('googleapis');
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Timesheet' });
});

var credentialFile = fs.readFileSync('credentials.json');
var creds = JSON.parse(credentialFile);

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

});

/* GET access token using auth key. */
router.get('/token', function(req, res, next) {
  var code = req.query.code;

  oauth2Client.getToken(code, function(err, tokens) {
    if (err) {
      console.log(err);
      res.send(err);
      return;
    }

    oauth2Client.setCredentials(tokens);

    res.send(tokens);
  });
});

module.exports = router;
