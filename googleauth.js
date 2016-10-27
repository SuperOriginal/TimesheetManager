var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var creds = require('./credentials.json');

module.exports = function(passport){
  passport.use(new GoogleStrategy({
    clientID        : creds.clientid,
    clientSecret    : creds.secret,
    callbackURL     : 'http://localhost:3000/auth/google/callback',
  },
  function(token, refreshToken, profile, done) {
    // make the code asynchronous
    // User.findOne won't fire until we have all our data back from Google
    process.nextTick(function(){
      User.findOne({'google.id': profile.id}, function(err, user){
        if(err)
          return done(err);
        if(user)
          return done(null, user);
        else {
          var newUser = new User();
          newUser.google.id = profile.id;
          newUser.google.token = accessToken;
          newUser.google.name = profile.displayName;
          newUser.google.email = profile.emails[0].value;

          newUser.save(function(err){
            if(err)
              throw err;
            return done(null, newUser);
          })
          console.log(profile);
        }
      });
    });

  }));
}
