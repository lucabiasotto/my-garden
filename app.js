console.info("myGarden is starting...");

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var dbUtils = require('./dbUtils');
var areasUtils = require('./areasUtils');
var weatherUtils = require('./weatherUtils');
var logger = require('./logger');


var app = express();

//si connette al db o lo crea se non esiste
dbUtils.openDbConnection((db) => {
  dbUtils.inizializeDb(() => {
    areasUtils.inizializeAreas(db, () => {
      //dbUtils.closeDbConnection();
    })
  });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//var logger = require('morgan');
//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); //definisce quale cartella è pubblica

//Passo le variabili che mi servo ai router
app.use(function (req, res, next) {
  //req.dbUtils = dbUtils; //passo avanti la connessione al db
  //req.weatherUtils = weatherUtils; 
  next();
});

//routing delle richieste
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/settings');
app.use('/', indexRouter);
app.use('/settings', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});


// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//Riattiva lo schedulatore dell'irrigazione
areasUtils.rescheduleIrrigation(dbUtils);


//Aggiorna il meteo
function getCurrentWeather() {
  logger.info("Update weather information");
  weatherUtils.getCurrentWeather();
  //aggiorna il meto ogni ora
  setTimeout(getCurrentWeather, 60 * 60 * 1000);
}
getCurrentWeather();

module.exports = app;