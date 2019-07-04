var express = require('express');
var areasUtils = require('../areasUtils');
var consts = require('../consts');
var router = express.Router();
var dbUtils = require('../dbUtils');
var weatherUtils = require('../weatherUtils');


/* GET home page. */
router.get('/', function (req, res, next) {

    var schedulerEnable = dbUtils.getAppParameter(consts.PARAM_SCHEDULER_ENABLE);
    var schedulerInProgress = dbUtils.getAppParameter(consts.PARAM_SCHEDULER_IN_PROGRESS);
    var schedulerTime = dbUtils.getAppParameter(consts.PARAM_SCHEDULER_TIME) ? dbUtils.getAppParameter(consts.PARAM_SCHEDULER_TIME) : "";
    areasUtils.getAllAreas(dbUtils.db, (rows) => {
        var pageArgs = {
            areas: rows,
            weatherInfo: weatherUtils.info,
            schedulerEnable: schedulerEnable,
            schedulerTime: schedulerTime,
            schedulerInProgress: schedulerInProgress
        };

        res.render('index', pageArgs);
    });
});

router.post('/irrigateArea', function (req, res) {

    var area = {
        id: req.body.id,
        active: req.body.active
    }

    areasUtils.turnOffAllArea(dbUtils.db, (err) => {

        areasUtils.updateArea(dbUtils.db, area, (err) => {

            if (!err) {

                if (req.body.active == 'Y') {
                    areasUtils.powerReleCard(true);
                    areasUtils.openMasterGPIO();
                    areasUtils.openGPIOForArea(area.id);
                } else {
                    dbUtils.setAppParameter(consts.PARAM_SCHEDULER_IN_PROGRESS, false);
                    areasUtils.closeMasterGPIO();
                    areasUtils.closeGPIOForArea(area.id);
                    areasUtils.powerReleCard(false);
                }
            }


            var result = {
                success: err == null,
                error: err == null ? err : err.message
            };

            //res.redirect("/"); non funziona
            res.send(JSON.stringify(result));
        });
    });
});

module.exports = router;
