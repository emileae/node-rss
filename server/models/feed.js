const mongoose = require('mongoose');
const validator = require('validator');

// feed
var FeedSchema = new mongoose.Schema({
  link: {
    type: String,
    required: true,
    minLength: 1,
    trim: true,
    unique: true,
    validate: {
      validator: validator.isURL,
      message: '{VALUE} is not a valid url.'
    }
  },
  guid: {
    type: String,
  },
  title: {
    type: String
  },
  description: {
    type: String
  },
  author: {
    type: String
  },
  pubDate: {
    type: String
  },
  _channel: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Channel'
  }
});

var Feed = mongoose.model('Feed', FeedSchema);

module.exports = {
  Feed
};
