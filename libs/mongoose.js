var mongoose    = require("mongoose");
var crypto      = require("crypto");
var log         = require("./log.js") (module);
var config      = require("./config");

mongoose.connect(config.get('mongoose:uri'));
var db = mongoose.connection;

db.on('error', function (err) {
  log.error('connection error: ', err.message);
});

db.on('open', function callback () {
  log.info("Connected to DB!");
});

var Schema = mongoose.Schema;

// Schemas

var Images = new Schema({
  kind: {
    type: String,
    enum: ['thumbnail', 'detail'],
    required: true
  },
  url: { type: String, required: true }
});

var Article = new Schema({
  title: { type: String, required: true },
  author: { type: String, required: true},
  description: {type: String, required: true},
  images: [Images],
  modified: {type: Date, default: Date.now }
});

var User = new Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  hashedPassword: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  }
});

User.methods.encryptedPassword = function(password) {
  return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
  //more secure - return crypto.pbkdf2Sync(password, this.salt, 10000, 512);
};

User.virtual('userId')
    .get(function(){
      return this.id;
    });

User.virtual('password')
    .set(function(password) {
      this._plainPassword = password;
      this.salt = crypto.randomBytes(32).toString('hex');
      //more secure - this.salt = crypto.randomBytes(128).toString('hex');
      this.hashedPassword = this.encryptedPassword(password);
    })
    .get(function() { return this._plainPassword });

User.methods.checkPassword = function(password) {
  return this.encryptedPassword(password) === this.hashedPassword;
};

var UserModel = mongoose.model('User', User);

//Client

var Client = new Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  clientId: {
    type: String,
    unique: true,
    required: true
  },
  clientSecret: {
    type: String,
    required: true
  }
});

var ClientModel = mongoose.model('Client', Client);

// Access Token

var AccessToken = new Schema({
  userId: {
    type: String,
    required: true
  },
  clientId: {
    type: String,
    required: true
  },
  token: {
    type: String,
    unique: true,
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  }
});

var AccessTokenModel = mongoose.model('AccessToken', AccessToken);

// Refresh Token

var RefreshToken = new Schema({
  userId: {
    type: String,
    required: true
  },
  clientId: {
    type: String,
    required: true
  },
  token: {
    type: String,
    unique: true,
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  }
});

var RefreshTokenModel = mongoose.model('RefreshToken', RefreshToken);

// validation
Article.path('title').validate(function (v) {
  return v.length > 5 && v.length < 70;
});

var ArticleModel = mongoose.model('Article', Article);

module.exports.ArticleModel = ArticleModel;
module.exports.UserModel = UserModel;
module.exports.ClientModel = ClientModel;
module.exports.AccessTokenModel = AccessTokenModel;
module.exports.RefreshTokenModel = RefreshTokenModel;
