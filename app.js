require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const SpotifyWebApi = require('spotify-web-api-node');
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));
const scopes = [
    'user-top-read',
];

let token = undefined;
let username = "";
var spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: "https://crescendo-music.onrender.com/callback"
});

app.get("/", function (req, res) {
    res.render("home");
})

app.get('/login', function (req, res) {
    console.log(spotifyApi.createAuthorizeURL(scopes));
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get("/callback", function (req, res) {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;

    if (error) {
        console.error('Callback Error:', error);
        res.send(`Callback Error: ${error}`);
        return;
    }

    spotifyApi
        .authorizationCodeGrant(code)
        .then(data => {
            const access_token = data.body['access_token'];
            const refresh_token = data.body['refresh_token'];
            const expires_in = data.body['expires_in'];

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);

            console.log('access_token:', access_token);
            token = access_token;
            console.log('refresh_token:', refresh_token);

            console.log(
                `Sucessfully retreived access token. Expires in ${expires_in} s.`
            );
            spotifyApi.setAccessToken(token);
            res.redirect("/warrant");

            setInterval(async () => {
                const data = await spotifyApi.refreshAccessToken();
                const access_token = data.body['access_token'];

                console.log('The access token has been refreshed!');
                console.log('access_token:', access_token);
                spotifyApi.setAccessToken(access_token);
            }, expires_in / 2 * 1000);
        })
        .catch(error => {
            console.error('Error getting Tokens:', error);
            res.send(`Error getting Tokens: ${error}`);
        });
});

app.get("/warrant", function (req, res) {
    if (!token) {
        res.redirect("/");
    }

    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(token);

    (async () => {
        const me = await spotifyApi.getMe();
        const user_id = me.body.id;
        username = me.body.display_name;
        console.log(me);
        console.log(user_id);
    })().catch(e => {
        console.error(e);
    });

    res.render("options");
});

app.get("/artists", function (req, res) {
    if (!token) {
        res.redirect("/");
    }

    spotifyApi.getMyTopArtists()
        .then(function (data) {
            let topArtists = data.body.items;
            console.log(new Date().getTime().toLocaleString('en-US', {}));
            let time = new Date().toLocaleString('en-in', { hour: '2-digit', minute: 'numeric', hour12: true })
            let date = new Date().toLocaleString('en-in', { month: 'short', day: 'numeric' })
            let year = new Date().toLocaleString('en-in', { year: 'numeric' })
            res.render("artists", { artists: topArtists, displayName: username, time, date, year });
        }, function (err) {
            console.log('Something went wrong!', err);
        });
});

app.get("/tracks", function (req, res) {

    if (!token) {
        res.redirect("/");
    }

    spotifyApi.getMyTopTracks({ time_range: 'medium_term', limit: 4 })
        .then(function (data) {
            let topTracks = data.body.items;
            let time = new Date().toLocaleString('en-in', { hour: '2-digit', minute: 'numeric', hour12: true })
            let date = new Date().toLocaleString('en-in', { month: 'short', day: 'numeric' })
            let year = new Date().toLocaleString('en-in', { year: 'numeric' })
            res.render("tracks", { songsList: topTracks, displayName: username, time, date, year });
        }, function (err) {
            console.log('Something went wrong!', err);
        });

});

app.listen(process.env.PORT, function () {
    console.log("Server started at port 3000");
});
