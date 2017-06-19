const express = require('express');
const bodyParser = require('body-parser');
// const FeedParser = require('feedparser');
// const request = require('request');
const _ = require('lodash');
const normalizeUrl = require('normalize-url');

var {mongoose} = require('./db/mongoose');
var {Channel} = require('./models/channel');
var {Feed} = require('./models/feed');
var {User} = require('./models/user');
var {UserChannel} = require('./models/userChannel');
var {authenticate} = require('./middleware/authenticate.js');
var {startUpdateFeeds} = require('./utils/cronJobs');
var {SaveFeed} = require('./utils/saveFeed');
// var {AddChannel} = require('./utils/addChannel');

var app = express();

app.use(bodyParser.json());

// Start cron jobs to update feeds
// startUpdateFeeds();

app.get('/', (req, res) => {
  console.log("hello");
});

// ==============================
// USERS
// ==============================
// User Registration
// authentication based on user email and password
// password is hashed and salted using bcryptjs node module
// TODO: store the jwt secret password as an environment variable
// x-auth header is set to the JSON web token generated using the jwt node module, secret password stored serverside
app.post('/users', (req, res) => {
  // TODO might be a hidden bug here, verify_password isn't part of the user model,
  // but it will try to set it and fail because, there is no verify_password field in User model
  var user = new User(_.pick(req.body, ['email', 'password', 'verify_password', 'name', 'surname']));
  // quick double check for password verification
  if (password === user.verify_password){
    user.save().then(() => {
      return user.generateAuthToken();// returns another promise
    }).then((token) => {
      res.header('x-auth', token).send(user);
    }).catch( (e) => {
      res.status(400).send(e);
    });
  }else{
    res.status(400).send("Passwords don't match");
  };

});

// user home
// Authenticated route to get basic user information
// authenticate middleware in authenticate.js
// checks the x-auth token is valid and belongs to a user
app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

// Login
// uses the static model method findByCredentials to check that the email exists in the DB
// and that the bcrypt hashed password matches the corresponding user
// a new login token is then set to the x-auth header, with a 200 response
app.post('/users/login', (req, res) => {
  var body = _.pick(req.body, ['email', 'password']);
  User.findByCredentials(body.email, body.password).then((user) => {
    return user.generateAuthToken().then((token) => {
      res.header('x-auth', token).send(user);
    });
  }).catch((e) => {
    console.log("login error: ", e);
    res.status(400).send();
  });

});

// Logout
//the Model instance method removeToken is called
// user.removeToken removes the token form the corresponding user's token array in the DB,
// so that subsequent calls with the old x-auth header will no longer be valid
app.delete('/users/me/token', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(()=>{
    res.status(200).send();
  }, ()=> {
    res.status(400).send();
  });
});

// ==============================
// RSS CHANNELS
// ==============================

// Adds a new channel to the DB
// only an authenticated user can add a new channel
app.post('/channels', authenticate, (req, res) => {
  console.log("have we got the user? ", req.user);
  var body = _.pick(req.body, ['url']);
  body.user = req.user;
  // use the Normalize library to get some kind of uniform URL
  // TODO: check this normalization to amke sure its fairly standard
  body.url = normalizeUrl(body.url);
  var channel = new Channel(body);

  channel.save().then(() => {
    // success, return the saved channel back to user
    return SaveFeed(channel).then(()=> {
      console.log("................ resolved saveFeed.....", body);

      // start a chained Promise
      var userChannel = new UserChannel({
        _channel: channel._id,
        _user: body.user._id
      });
      // // TODO: make sure this isn't duplicated, a user shouldnt have more than one reference to a channel
      // // duplication may be taken care of since a channel can be uploaded at most once
      // //... explore edge cases
      // userChannel.save().then(()=> {
      //   res.status(200).send(channel);
      // }).catch((e) => {
      //   console.log("error saving userChannel");
      //   res.status(400).send();
      // });

      // res.status(200).send(channel);

      userChannel.save();// this should call the second then

    });
  }).then((userChannel)=> {
    res.status(200).send(userChannel);
  }).catch( (e) => {
    // something went wrong saving to the DB
    // this is where a duplicate error may occur
    console.log("Something went wrong... probably with Promises", e);
    res.status(400).send(e);
  });
});

app.patch('/channels/:channelId', authenticate, (req, res) => {
  // if a channel has been added and has no feeds, then it can be edited
  // if an existing channel has feeds, then other users may be referencing this channel and its child feeds,
  // so can't edit it directly, only the currently logged in user's access to the channel
  var body = _.pick(req.body, ['url']);

  UserChannel.confirmUserOwnership(req)
  .then((userChannel)=>{
    // if there's at least one feed item, then can't edit the feed, just remove and delete
    return Feed.findOne({
      _channel: userChannel._channel
    });
  }).then((feedItem)=>{
    if (feedItem !== null){
      res.status(200).send("There are feeds here, can't edit");
      // delete this userChannel from DB
      // create a new channel and userChannel with the new url, if its valid
    }else{
      res.status(200).send("No feeds here, can change the url");
    }
  }).catch((e)=>{
    res.status(400).send("Unable to edit a channel: ", e);
  });
});

app.delete('/channels/:channelId', authenticate, (req, res) => {
  UserChannel.confirmUserOwnership(req)
  .then((userChannel)=>{
    UserChannel.findByIdAndRemove(userChannel._id).then((userChannel)=>{
      res.status(200).send(userChannel);
    });
  }).catch((e)=>{
    res.status(400).send("Unable to remove channel: ", e);
  });
})

// ==============================
// User's RSS CHANNELS / FEEDS
// ==============================

app.get('/users/channels', authenticate, (req, res) => {
  UserChannel.find({
    _user: req.user._id
  }).then((channels)=>{
    res.status(200).send(channels);
  }).catch((e)=>{
    res.status(400).send("Couldn't find user's channels: ", e);
  });
});

app.get('/channels/:channelId', authenticate, (req, res) => {
  // var channelId = req.params.channelId;
  // first check that channel belongs to user
  UserChannel.confirmUserOwnership(req)
  // find feeds that match the channel
  .then((userChannel)=>{
    return Feed.find({
      _channel: userChannel._channel
    }).limit(20);
  }).then((feedItems)=>{
      res.status(200).send(feedItems);
  }).catch((e)=>{
    res.status(400).send("Couldn't locate feeds for channel ", e);
  });
});

// run the app... TODO: make this ready for production
app.listen(3000, () => {
  console.log("Started on port 3000");
});
