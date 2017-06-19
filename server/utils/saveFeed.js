const FeedParser = require('feedparser');
const request = require('request');
const _ = require('lodash');

var {Feed} = require('./../models/feed');

var SaveFeed = (channel) => {

  return new Promise((resolve, reject) => {

    var req = request(channel.url);
    var feedparser = new FeedParser();

    req.on('error', function (error) {
      reject("Unable to reach RSS channel", error);
    });

    req.on('response', function (res) {
      var stream = this; // `this` is `req`, which is a stream
      if (res.statusCode !== 200) {
        // this.emit('error', new Error('Bad status code, when requesting Channel URL'));
        reject("Bad status code, when requesting Channel URL");
      }
      else {
        stream.pipe(feedparser);
      }
    });

    feedparser.on('error', function (error) {
      // always handle errors
      reject("Unable to parse RSS feed", error);
    });

    feedparser.on('readable', function () {
      console.log("Start parsing feed.......");
      // This is where the action is!
      var stream = this; // `this` is `feedparser`, which is a stream
      var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
      var item;

      // This probably doesn't need to complete before returning success to server.js
      // it just needs to be kicked off
      // but if user wants to see complete list right away, then need to wait...

      var items = [];
      while (item = stream.read()) {
        console.log(item.title);
        // pull the relevant properties form the item object
        item = _.pick(item, ['title', 'description', 'link', 'guid', 'author', 'pubDate']);
        // add the channel id to the feed item
        item._channel = channel._id;
        item.pubDate = item.pubDate.getTime();// convery to milliseconds since 1970
        items.push(item);

      };

      // TODO: check this for efficiency
      // if there are a ton of feeds and we're making DB entries machine gun style
      // might be a bottleneck
      // var feed = new Feed(item);
      // feed.save().then(() => {
      //   // success, managed to save a feed item
      //   console.log("saved feed item");
      // }).catch( (e) => {
      //   // might be a duplicate or some other error
      //   console.log("error saving feed item", e);
      //   next();
      // });

      Feed.insertMany(items).then(()=>{
        // success case, feed has been saved successfully
        resolve();
      }).catch((error) => {
        reject("Unable to insertMany: ", error);
      });

    });
  });

};

module.exports = {
  SaveFeed: SaveFeed
}
