require('dotenv').config()
const express = require("express");
const reload = require('reload')
const session = require('express-session');
const bodyParser = require("body-parser");
const passport = require("passport");
const twitchStrategy = require("passport-twitch").Strategy;
const rbx = require("noblox.js")

const Datastore = require('nedb')
const db = new Datastore({ filename: './users.db', autoload: true });
const app = express();

const SESSION_SECRET = process.env.SESSION_SECRET;
const clientId = process.env.clientId;
const clientSecret = process.env.clientSecret;
const callbackUrl = process.env.callbackUrl;
const port = process.env.port || 8734;
const adminName = process.env.adminName || 'cooprompus';

app.set("views", "./views");
app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static('public'));
app.use(passport.session());

passport.use(new twitchStrategy({
	clientID: clientId,
	clientSecret: clientSecret,
	callbackURL: callbackUrl,
	scope: "user_read",
	state: true
},
	function(accessToken, refreshToken, profile, done) {
		//console.log(profile)
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
		res.send('<html><head><title>Login</title></head><a href="/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>');
	}
});

app.get("/roblox", (req, res) => {
	if(req.session && req.session.passport && req.session.passport.user) {
		res.render('roblox', {twitch: req.session.passport.user.username})
	}else {
		res.send('<html><head><title>Login</title></head><a href="/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>');
	}
})

app.post("/register", (req, res) => {
	//console.log("request")
	//console.log(req)
	rbx.getIdFromUsername(req.body.roblox)
		.then((robloxId) => {
			console.log(`found id: ${robloxId} for roblox user ${req.body.roblox}`)
			db.update({ "twitch": req.session.passport.user.username }, { "twitch": req.session.passport.user.username, "roblox": req.body.roblox, "robloxId": robloxId, "email": req.session.passport.user.email}, { upsert: true })
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

app.get("/manage", isAdmin, (req, res) => {
	console.log("current registered users:")
	db.find({}, function (err, docs) {
		if(err) console.log(err)
		console.log(docs)
		res.render('manage', { users : docs })
	});
})

function isAdmin(req, res, next) {
    //if (passport.authenticate("twitch") && req.session.passport.user.username === adminName){
		return next();
//	}
 //   res.redirect('/');
}

app.get('/user/roblox/:robloxId', function(req, res) {
	console.log("looking up info for roblox id: " + req.params.robloxId);
	db.find({ roblixId: req.params.roblixId }, function (err, docs) {
		console.log("found user: ")
		console.log(docs)
		res.send(docs);
	});
});

app.post("/user/update", isAdmin, (req, res) => {
	rbx.getIdFromUsername(req.body.roblox)
		.then((robloxId) => {
			console.log("updating db")
			return db.update({ "twitch": req.body.twitch }, { "twitch": req.body.twitch, "roblox": req.body.roblox, "robloxId": robloxId, "discord": req.body.discord, "mod":req.body.mod==="on", "vip":req.body.vip==="on", "ban":req.body.ban==="on", "email": req.body.email}, { upsert: true })
		}).then(() => {
			console.log("redirecting")
			res.redirect("/manage")
		}).catch((err) => {
			console.log("problem updating user: " + req.body.twitch);
			console.log(err)
			res.send(`<html><head><title>Problem</title></head><p>${err}</p></html>`);
		})
})


console.log("current registered users:")
db.find({}, function (err, docs) {
	if(err) console.log(err)
	console.log(docs)
});

reload(app);

app.listen(port);

