const mongoose = require('mongoose');
const validator = require('validator');

// channel
var ChannelSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    minLength: 1,
    trim: true,
    unique: true,
    validate: {
      validator: validator.isURL,
      message: '{VALUE} is not a valid url.'
    }
  }
});

var Channel = mongoose.model('Channel', ChannelSchema);

module.exports = {
  Channel
};
