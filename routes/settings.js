var express = require('express');
var areasUtils = require('../areasUtils');
var consts = require('../consts');
var dbUtils = require('../dbUtils');


var router = express.Router();

router.get('/', function (req, res, next) {

  var schedulerTime = dbUtils.getAppParameter(consts.PARAM_SCHEDULER_TIME) ? dbUtils.getAppParameter(consts.PARAM_SCHEDULER_TIME) : "21:00";
  areasUtils.getAllAreas(dbUtils.db, (rows) => {
    var args = {
      schedulerTime: schedulerTime,
      areas: rows,
      schedulerEnable: dbUtils.getAppParameter(consts.PARAM_SCHEDULER_ENABLE)
    }
    res.render('settings', args);
  });
});


router.get('/area/:id', function (req, res, next) {

  var id = req.params.id;

  areasUtils.getAreaById(dbUtils.db, id, (row) => {
    res.send(JSON.stringify(row));
  });
});


router.post('/updateArea', function (req, res) {

  var area = req.body;
  if (area.enable != "Y") {
    area.enable = 'N';
  }

  areasUtils.updateArea(dbUtils.db, area, (success) => {
    //ricarica la pagina
    res.redirect("/settings");
  });

});


router.post('/updateScheduler', function (req, res) {

  //aggiorna scheduler on / off
  var schedulerSettings = req.body;
  if (schedulerSettings.enable) {
    if (schedulerSettings.enable != "Y") {
      schedulerSettings.enable = 'N';
    }
    dbUtils.setAppParameter(consts.PARAM_SCHEDULER_ENABLE, schedulerSettings.enable);
  }
  //aggiorna data schedulazione
  if (schedulerSettings.time) {
    dbUtils.setAppParameter(consts.PARAM_SCHEDULER_TIME, schedulerSettings.time);
  }


  areasUtils.rescheduleIrrigation(dbUtils);

  var respose = {
    success: true
  }
  res.send(JSON.stringify(respose));
});

router.get('/startScheduler', function (req, res) {

  var irrigateStareted = areasUtils.startIrrigation(dbUtils);

  var respose = {
    success: irrigateStareted
  }
  res.send(JSON.stringify(respose));
});


module.exports = router;
