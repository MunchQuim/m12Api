const passport = require('passport');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

const GOOGLE_CLIENT_ID = '1001025041171-8tdb4e6g49q18h1n4aeleeklkmmj61bk.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

passport.use(new GoogleStrategy({
  clientID:     GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "https://localhost:3000/google/callback",
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