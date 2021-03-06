var express = require('express');
var router = express.Router();

module.exports = function(passport){
  router.get('/authenticated', function(req,res){
    res.json({authenticated: req.isAuthenticated()});
  });
  //log in
  router.get('/google', passport.authenticate('google', {
    scope: ['profile','email','https://www.googleapis.com/auth/spreadsheets'],
    accessType: 'offline',
    approvalPrompt: 'force'
  }));

  router.get('/google/callback', passport.authenticate('google', {
    successRedirect: '/#edit',
    failureRedirect: '/'
  }));

  //log out
  router.get('/logout', function(req, res) {
    req.logout();
    res.end();
  });

  return router;
}
