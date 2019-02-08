const express        = require("express");
const session        = require('express-session');
const bodyParser     = require("body-parser");
const passport       = require("passport");
const twitchStrategy = require("passport-twitch").Strategy;
const rbx = require("noblox.js")

const Datastore = require('nedb')
const db = new Datastore({ filename: './users.db', autoload: true });
const app = express();

const SESSION_SECRET   = '';

app.set("views", "./views");
app.set('view engine', 'pug')

app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static('public'));
app.use(passport.session());

const clientId = '';
const clientSecret = '';
const callbackUrl = '';
const port = 8734;

passport.use(new twitchStrategy({
	clientID: clientId,
	clientSecret: clientSecret,
	callbackURL: callbackUrl,
	scope: "user_read",
	state: true
},
	function(accessToken, refreshToken, profile, done) {
		console.log(profile)
		profile.accessToken = accessToken;
		profile.refreshToken = refreshToken;
		done(null, profile);
	}
));

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));
app.get("/auth/twitch/callback", passport.authenticate("twitch", { successRedirect: '/roblox', failureRedirect: "/" }))

app.get('/', function (req, res) {
	if(req.session && req.session.passport && req.session.passport.user) {
		res.send(template(req.session.passport.user));
	} else {
		res.send('<html><head><title>Twitch Auth Sample</title></head><a href="/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>');
	}
});

app.get("/roblox", (req, res) => {
	if(req.session && req.session.passport && req.session.passport.user) {
		res.render('roblox', {twitch: req.session.passport.user.username})
	}else {
		res.send('<html><head><title>Twitch Auth Sample</title></head><a href="/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>');
	}
})

app.post("/register", (req, res) => {
	rbx.getIdFromUsername(req.body.roblox)
		.then((robloxId) => {
			console.log(`found id: ${robloxId} for roblox user ${req.body.roblox}`)
			db.update({ "twitch": req.session.passport.user.username }, { "twitch": req.session.passport.user.username, "roblox": req.body.roblox, "robloxId": robloxId}, { upsert: true })
		})
		.then(() => 
			res.render('index', {twitch: req.session.passport.user.username, roblox: req.body.roblox})
		)
		.catch((err) => {
			console.log(`problem saving twitch user: ${req.session.passport.user.username}`)
			console.log(err)
			res.send(`<html><head><title>Problem</title></head><p>${err}</p><a href="/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>`);
		})
})

console.log("current registered users:")
db.find({}, function (err, docs) {
	if(err) console.log(err)
	console.log(docs)
});

app.listen(port);

