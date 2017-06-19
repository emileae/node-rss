var mongoose = require('mongoose');

mongoose.Promise = global.Promise;// tell mongoose that we're using promises not callbacks... only do thins once here
mongoose.connect('mongodb://localhost:27017/RSS');

module.exports = {mongoose};
