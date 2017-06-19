var {User} = require('./../models/user');

var authenticate = (req, res, next) => {
  var token = req.header('x-auth');

  User.findByToken(token).then((user) => {
    if (!user){
      return Promise.reject();// takes this into the catch block, to send a 401 status
    }
    req.user = user;
    req.token = token;
    next();// call next in middleware so that the anonymous function in the next argument runs
  }).catch((e) => {
    // 401 status = no auth
    // this error will be throwm for any badly authenticated routes
    res.status(401).send();
    // don't call next() here because we want the error to run
  });
}

module.exports = {authenticate};
