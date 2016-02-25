var express           = require('express'); // load express framework
var path              = require('path'); // path parsing module
var morgan            = require('morgan'); // logging for HTTP requests
var methodOverride    = require('method-override');
var bodyParser        = require('body-parser');
var favicon           = require('serve-favicon');
var assert            = require('assert'); // Mocha assert module
var passport          = require('passport');
var oauth2            = require('./libs/oauth2');
var log               = require('./libs/log.js')(module);
var config            = require('./libs/config');
var ArticleModel      = require('./libs/mongoose').ArticleModel;
var app = express();

app.use(favicon(__dirname + '/public/favicon.ico')); // use default favicon
app.use(morgan('dev')); // log all requests
app.use(bodyParser.urlencoded({
  extended: true
})); // URL encoding support
app.use(bodyParser.json()) // JSON parsing
app.use(methodOverride()); // enable HTTP PUT and DELETE support
app.use(passport.initialize());
//app.use(app.router); // simple route management
app.use(express.static(path.join(__dirname, "public"))); // starting static fileserver, that will watch `public` folder (in our case there will be `index.html`)

/*
* AUTHENTICATION
*/

require('./libs/auth');

app.post('/oauth/token', oauth2.token);

app.get('/api/userInfo', passport.authenticate('bearer', {session: false}), function(req, res) {
  /*
    req.authInfo is set up using the 'info' argument supplied by the 'BearerStrategy'. It is
    typically used to indicate the scope of a token, and used in access control checks. For
    illustrative purposes, this example simply returns the scope in the response.
  */
  res.json({ user_id: req.user.userId, name: req.user.username, scope: req.authInfo.scope });
});

/*
*  ROUTES
*/

app.get('/api', function(req, res) { // req = request, res = response
  res.send('API is running.');
});

app.get('/api/articles', function(req, res){
  return ArticleModel.find(function(err, articles) {
    if (!err) {
      return res.send(articles);
    } else {
      res.statusCode = 500;
      log.error('Internal error (%d): %s', res.statusCode, err.message);
      return res.send({error: 'Server error'});
    }
  });
});

app.post('/api/articles', function(req, res){
  var article = new ArticleModel({
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    images: req.body.images
  });
  article.save(function (err){
    if (!err) {
      log.info("article created");
      return res.send({ status: 'OK', article:article });
    } else {
      console.log(err);
      if(err.name == 'ValidationError') {
        res.statusCode = 400;
        res.send({ error: "Validation error"});
      } else {
        res.statusCode = 500;
        res.send({ error: "Server error"});
      }
    }
  });
});

app.get('/api/articles/:id', function(req, res){
  return ArticleModel.findById(req.params.id, function (err, article){
    if (!article) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }
    if (!err) {
      return res.send({ status: "OK", article: article });
    } else {
      res.statusCode = 500;
      log.error('Internal error (%d): %s', res.statusCode, err.message);
      return res.send({ error: 'Server error' });
    }
  });
});

app.put('/api/articles/:id', function(req, res){
  return ArticleModel.findById(req.params.id, function (err, article) {
    if (!article) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }

    article.title = req.body.title;
    article.description = req.body.description;
    article.author = req.body.author;
    article.images = req.body.images;
    return article.save(function (err) {
      if (!err) {
        log.info("Article updated.");
        return res.send({ status: "OK", article: article });
      } else {
        if (err.name == "ValidationError") {
          res.statusCode = 400;
          res.send({ error: "Validation error" });
        } else {
          res.statusCode = 500;
          res.send({ error: "Server error" });
        }
        log.error('Internal error (%d): %s', res.statusCode, err.message);
      }
    });
  });
});

app.delete('/api/articles/:id', function(req, res){
  return ArticleModel.findById(req.params.id, function (err, article){
    if (!article) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }
    return article.remove(function (err){
      if (!err) {
        log.info('Article removed.');
        return res.send({ status: "OK" });
      } else {
        res.statusCode = 500;
        log.error('Internal error (%d): %s', res.statusCode, err.message);
        return res.send({ error: 'Server error' });
      }
    });
  });
});


/*
* ERROR HANDLING
*/


//Force error
app.get('/ErrorExample', function(req, res, next){
  next(new Error("Random error!"));
});

//404 error handling
app.use(function(req, res, next){
  res.status(404);
  log.debug('Not found URL: %s', req.url);
  res.send({ error: 'Not found' });
  return;
});

//500 error handling
app.use(function(req, res, next) {
  res.status(err.status || 500);
  log.error('Internal Error (%d): %s', res.statusCode, err.message);
  res.send({ error: err.message });
  return;
});

app.listen(config.get('port'), function(){
  log.info('Express server listening on port '+ config.get('port'));
});
