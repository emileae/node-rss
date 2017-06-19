const mongoose = require('mongoose');

// feed
var UserChannelSchema = new mongoose.Schema({
  _channel: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Channel'
  },
  _user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
});

UserChannelSchema.statics.confirmUserOwnership = function(req){

  return UserChannel.findOne({
    _user: req.user._id,
    _channel: req.params.channelId
  });
  
}

var UserChannel = mongoose.model('UserChannel', UserChannelSchema);

module.exports = {
  UserChannel
};
