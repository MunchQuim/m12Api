const passport = require('passport');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

const GOOGLE_CLIENT_ID = '1001025041171-egvnifv8061244k2n7gso7sdk2bn1ur2.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

passport.use(new GoogleStrategy({
  clientID:     GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  passReqToCallback   : true
},
function(request, accessToken, refreshToken, profile, done) {
/*   User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return done(err, user);
  });  esto debera mantenerse comentado hasta que desee hacerlo funcionar con usuarios reales*/
    return done(null, profile);
}
));
passport.serializeUser(function(user, done){
  done(null,user);
})
passport.deserializeUser(function(user, done){
  done(null,user);
})