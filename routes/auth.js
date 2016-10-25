var express = require('express');
var router = express.Router();

module.exports = function(passport){

	//sends successful login state back to angular
  router.get('/success', function(req, res){
    res.send({state: 'success', user: req.user ? req.user : null});
  });

	//sends failure login state back to angular
  router.get('/failure', function(req, res){
    res.send({state: 'failure', user: null, message: 'Failed to authenticate with Google'});
  });

	//log in
  router.post('/login', passport.authenticate('google', {
    scope:
    	[ 'https://www.googleapis.com/auth/plus.login',
    	, 'https://www.googleapis.com/auth/plus.profile.emails.read' ]
  }));

  router.get('/callback',
      passport.authenticate( 'google', {
          successRedirect: '/auth/success',
          failureRedirect: '/auth/failure'
  }));

	//log out
  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  return router;
}
