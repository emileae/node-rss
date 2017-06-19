
var FeedParser = require('feedparser');
var request = require('request'); // for fetching the feed

var {mongoose} = require('./../db/mongoose');
var {Channel} = require('./../models/channel');
var {FeedItem} = require('./../models/channel');

var AddChannel = (req, res) => {

  // check if channel is already saved
  Channel.findOne({
    url: req.body.url
  }).then((channel) => {
    console.log("Channel", channel);
    // channel exists in DB, so need to send user a message
    if (channel !== null){
      console.log("Channel already exists");
      res.send(null);// placeholder for now, should redirect to error message, or send somethign to change React state
    }
    // channel isn't already stored in DB, so can save
    else
    {
      console.log("Channel doesn't exist, can save to DB");
      // check if its a valid RSS channel

      var feedReq = request(req.body.url);
      var feedparser = new FeedParser();
      feedReq.on('error', function (error) {
        console.log("Unable to reach Feed URL");
      });

      feedReq.on('response', function (feedRes) {
        var stream = this; // `this` is `req`, which is a stream

        if (feedRes.statusCode !== 200) {
          this.emit('error', new Error('Bad status code'));
        }
        else {
          stream.pipe(feedparser);
        }
      });

      feedparser.on('error', function (error) {
        console.log("Unable to parse Feed", error);
      });

      feedparser.on('readable', function () {
        // save channel to DB
        var channel = new Channel({
          url: req.body.url
        });
        channel.save().then((doc) => {
          res.send(doc);
          // trigger initial feed updating
        }, (e) => {
          res.status(400).send(e);
        });

        // Save the feed items to the DB
        // extract this out into its own callable function
        var stream = this; // `this` is `feedparser`, which is a stream
        var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
        var item;

        while (item = stream.read()) {
          // console.log('Save each unique item...');
          // FeedItem.findOne({
          //   guid: item.guid
          // }).then((existingFeedItem) => {
          //     console.log("something... ", existingFeedItem);
          //   // if (feedItem === null){
          //   //   console.log(item);
          //   //   var feedItem = new FeedItem({
          //   //     title: item.title,
          //   //     description: item.description,
          //   //     guid: item.guid,
          //   //     link: item.link,
          //   //     channel: channel._id
          //   //   });
          //   //   feedItem.save();
          //   // }else{
          //   //   console.log("already saved this item");
          //   // }
          // });

          var feedItem = new FeedItem({
              title: item.title,
              description: item.description,
              guid: item.guid,
              link: item.link,
              channel: channel._id
            });
            feedItem.save();

        }

      });

    }
  });

};

module.exports = {
  AddChannel
}
