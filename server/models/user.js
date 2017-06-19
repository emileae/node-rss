const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');// hashing for auth
const _ = require('lodash');
const bcrypt = require('bcryptjs');// use this to salt and hash the password

var UserSchema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      trim: true,
      minLength: 1,
      unique: true,
      validate: {
        validator: validator.isEmail,
        message: '{VALUE} is not a valid email.'
      }
    },
    password: {
      type: String,
      required: true,
      minLength: 6
    },
    tokens: [{
      access: {
        type: String,
        required: true
      },
      token: {
        type: String,
        required: true
      }
    }],
    name: String,
    surname: String
});

// override this method to not send back password or tokens
UserSchema.methods.toJSON = function(){
  var user = this;
  var userObject = user.toObject();

  return _.pick(userObject, ['_id', 'email']);
}

// cant use arrow function here, need 'this' passed to an instance method
UserSchema.methods.generateAuthToken = function(){
  var user = this;
  var access = 'auth';
  var token = jwt.sign({_id: user._id.toHexString(), access}, 'secretpasswordTurbulentFlux').toString();
  user.tokens.push({
    access,
    token
  });

  // need to return promises, so that promises can be chained
  return user.save().then(()=> {
    return token;// this gets passed as a success argument for a promise in server.js
  });
}

UserSchema.methods.removeToken = function(token){
  var user = this;
  //$pull is a mongodb operator: pull an item from tokens array, where the token property = token
  return user.update({
    $pull: {
      tokens: {token}
    }
  })
};

// model method for checking auth
UserSchema.statics.findByToken = function(token){
  var User = this;// this is th model not a user instance/document
  var decoded;

  try {
      decoded = jwt.verify(token, 'secretpasswordTurbulentFlux');
  }catch (e){
    // need to always send a rejected promise if error, so that no user code is returned

    return Promise.reject();// this will reject the promise returned in server.js

  }

  // so if no errors then this runs...
  return User.findOne({
    '_id': decoded._id,
    'tokens.token': token,// query a nested document, i.e. an array or tokens
    'tokens.access': 'auth'
  });

};

UserSchema.statics.findByCredentials = function(email, password){
  var User = this;

  return User.findOne({email}).then((user) => {
    if (!user){
      return Promise.reject();
    }

    // bcrypt only supports callbacks, so make a new promise
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, function(err, res) {
          if (res){
            resolve(user);
          }else{
            reject();
          }
      });
    });

  });
};

// pre is mongoose middleware... called before an event
UserSchema.pre('save', function(next){
  var user = this;

  // returns true if its modified, don't want to re-hash an existing password hash
  if (user.isModified('password')){
    // generate a salt and ahsh the password and save that to DB
    // genSalt is slowed to 10 cycles to discourage brute force attacks
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
          user.password = hash;
          next();
      });
    });
  }else{
    next();
  }
});

var User = mongoose.model('User', UserSchema);

module.exports = {
  User
};
