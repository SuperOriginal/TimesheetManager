var express = require('express');
var router = express.Router();

module.exports = function(passport){

  //sends successful login state back to angular
  router.get('/success', function(req, res){
    console.log(req.user);
    res.send({state: 'success', user: req.user ? req.user : null});
  });

  //sends failure login state back to angular
  router.get('/failure', function(req, res){
    res.send({state: 'failure', user: null, message: 'Failed to authenticate with Google'});
  });

  //log in
  router.get('/google', passport.authenticate('google', {
    scope: ['profile','email','https://www.googleapis.com/auth/spreadsheets']
  }));

  router.get('/google/callback', callback);


  function callback(req,res,next){
    passport.authenticate('google',function(err, user, info) {
      if(err) {
        return next(err);
      }
      if(!user) {
        return res.redirect('/');
      }
      res.writeHead(302, {
        'Location': 'http://localhost:3000/#/edit?token=' + user.accessToken + '&user=' + user.profile.id
      });
      res.end();
    })(req,res,next);
  }

  //log out
  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  return router;
}
