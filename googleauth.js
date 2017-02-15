var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
var refresh = require('passport-oauth2-refresh');
var credentials = require('./credentials.json');

module.exports = function(passport){

  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  var strategy = new GoogleStrategy({
      clientID:     credentials.clientid,
      clientSecret: credentials.secret,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      passReqToCallback: true
    },
    function(request, accessToken, refreshToken, profile, done) {
      var user = {
        accessToken: accessToken,
        refreshToken: refreshToken
      }

      request.login(user, function(err){
        if(err){
          return next(err);
        }
        return done(null,user);
      });
    }
  );
  passport.use(strategy);
  refresh.use(strategy);
}
