/*

  Welcome to EIBIO API
  ====================

  Open API to get eibio.
*/
var express       = require('express'),        // call express
    session       = require('express-session'),
    
    settings      = require('./settings'),

    app           = exports.app = express(),                 // define our app using express
    port          = settings.port || process.env.PORT || 8000,
    server        = app.listen(port),
    io            = require('socket.io')
                      .listen(server),

    // auth          = require('./auth'), // auth mechanism with passport
    
    bodyParser    = require('body-parser'),
    cookieParser  = require('cookie-parser'),
    
    fs            = require('fs'),
    morgan        = require('morgan'),    // logging puropse
    
    ctrl          = require('require-all')({
                      dirname: __dirname + '/controllers',
                      filter  :  /(.*).js$/,
                      resolve : function (f) {
                        return f(io);
                      }
                    }),
    
    _             = require('lodash'),
    
    clientRouter  = express.Router(),
    apiRouter     = express.Router();


// initilalize session middleware
var sessionMiddleware = session({
  name: 'eibio.sid',
  secret: settings.secret.cookie,
  trustProxy: false,
  resave: true,
  saveUninitialized: true
})


/*
  
  add set | use
  ---
  
*/
// configure logger
app.use(morgan('combined', {
  stream: fs.createWriteStream(settings.logs.access, {flags: 'a'})
}));
// configure static files and jade templates
app.use(express.static('./client/src'));
app.set('views', './client/views');
app.set('view engine', 'jade');
// configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// configure app to use sessions
app.use(cookieParser());
app.use(sessionMiddleware);
// add json spaces
settings.debug == true && app.set('json spaces', 2);

/*

  Registering routes ...
  ---

*/
app.use('/', clientRouter); // client router
app.use('/api', apiRouter);



/*

  Client Routes
  ---

*/
clientRouter.route('/').
  get(function (req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
      res.render('index', {
        user: req.user || 'anonymous',
        message: 'hooray! welcome to our api!'
      });
  });

  

/*

  Express specific responses
  ---
  
*/
express.response.ok = function(result, info, warnings) {
  var res = {
    status: 'ok',
    result: result
  };
  
  if(info)
    res.info = info;
  
  if(warnings)
    res.warnings = warnings
  
  return this.json(res, null, 2);
};

express.response.error = function(statusCode, err) {
  return this.status(statusCode).json({
    status: 'error',
    error: _.assign({
      code: statusCode,
    }, err)
  });
};

/*
  
  Socket io config
  ------
  
  listen to connections with socket.io.
  Cfr. controllers/*.js to find how io has been implemented.
  
*/
io.use(function (socket, next) {
  sessionMiddleware(socket.request, {}, next);
});

/*

 API Routes
  ---

*/
apiRouter.route('/').
  get(function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.ok({ message: 'hooray! welcome to our api!' });   
  });

/*

  Controller: person
  -------------------
  
  Cfr. controllers/person.js
  Cfr Neo4j queries: queries/person.cyp
  
*/
apiRouter.route('/person')
  .get(ctrl.person.getItems)
apiRouter.route('/person/:slug([\\da-z-]+)')
  .get(ctrl.person.getItem)
apiRouter.route('/person/:slug([\\da-z-]+)/related/:model(person|activity|media)')
  .get(ctrl.person.getRelatedItems)
  
/*

  Controller: activity
  --------------------
  
  Cfr. controllers/activity.js
  Cfr Neo4j queries: queries/activity.cyp
  
*/
apiRouter.route('/activity')
  .get(ctrl.activity.getItems)
apiRouter.route('/activity/:slug([\\da-z-]+)')
  .get(ctrl.activity.getItem)
apiRouter.route('/activity/:slug([\\da-z-]+)/related/:model(person|activity)')
  .get(ctrl.activity.getRelatedItems)
  
/*

  Controller: institution
  --------------------
  
  Cfr. controllers/institution.js
  Cfr Neo4j queries: queries/institution.cyp
  Test test/controllers.institution.js
*/
apiRouter.route('/institution')
  .get(ctrl.institution.getItems)
apiRouter.route('/institution/:slug([\\da-z-]+)')
  .get(ctrl.institution.getItem)
apiRouter.route('/institution/:slug([\\da-z-]+)/related/:model(person|institution)')
  .get(ctrl.institution.getRelatedItems)


/*

  Controller: search
  --------------------
  
  Cfr. controllers/search.js
  Cfr Neo4j queries: queries/search.cyp
  Test test/controllers.search.js
  Each route accept a GET param q= limit and offsets as well
  fuzzy search return a list of possible candidates
*/
// apiRouter.route('/search')
//   .get(ctrl.search.fuzzy)
apiRouter.route('/search/suggest')
  .get(ctrl.search.suggest)
// apiRouter.route('/search/:model(person|activity|institution)')
//   .get(ctrl.search.lookup)
apiRouter.route('/search/viaf')
  .get(ctrl.search.viaf.autosuggest)

apiRouter.route('/search/distill')
  .get(ctrl.search.distill)
  