var request = require('request');
var logger = require('./logger');

var API_KEY = "1b3124c9983b5db6e6344b26aca89812";
var API_KEY_NAME = "mygarden";
var LATTITUDE = "45.724208"
var LONGITUDE = "12.699902";

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