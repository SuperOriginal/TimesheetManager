var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
var credentials = require('./credentials.json');

module.exports = function(passport){
  passport.use(new GoogleStrategy({
    clientID:     credentials.clientid,
    clientSecret: credentials.secret,
    callbackURL: 'http://localhost:3000/auth/callback',
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    return done(null, profile)
  }
));
}
