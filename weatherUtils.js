var request = require('request');
var logger = require('./logger');

var API_KEY = "YOUR_KEY";
var API_KEY_NAME = "YOUR_API_NAME";
var LATTITUDE = "00.00000"
var LONGITUDE = "00.00000";

var info;

function getCurrentWeather(){
    let url = `http://api.openweathermap.org/data/2.5/weather?lat=${LATTITUDE}&lon=${LONGITUDE}&appid=${API_KEY}&units=metric`
    request(url, function (err, response, body) {
        if(err){
          logger.error("Can't retrive weather informations: ", err);
        } else {
          logger.info('Weather information body: ', body);
          info = JSON.parse(body);
          exports.info = info;
        }
      });
}

exports.info = info;
exports.getCurrentWeather = getCurrentWeather;