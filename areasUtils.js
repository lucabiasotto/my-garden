var schedule = require('node-schedule');
var consts = require('./consts');
var dateFormat = require('dateformat');
var weatherUtils = require('./weatherUtils');
var logger = require('./logger');

var GPIO_ON = 1;
var GPIO_OFF = 0;

let ELETTROVALVOLE;
let Gpio;
try {
    Gpio = require('onoff').Gpio;
    ELETTROVALVOLE = {
        MASTER: new Gpio(2, 'out'),
        POWER_SCHEDA: new Gpio(11, 'out'),
        AEREA_1: new Gpio(3, 'out'),
        AEREA_2: new Gpio(4, 'out'),
        AEREA_3: new Gpio(17, 'out'),
        AEREA_4: new Gpio(27, 'out'),
        AEREA_5: new Gpio(22, 'out'),
        AEREA_6: new Gpio(10, 'out'),
        AEREA_7: new Gpio(9, 'out')
    }

} catch (ecc) {
    logger.error("GPIO module not available");

    var fakeElettrovalvola = {};
    fakeElettrovalvola.writeSync = function () {
        logger.error("GPIO writeSync available");
    };
    ELETTROVALVOLE = {
        MASTER: fakeElettrovalvola,
        AEREA_1: fakeElettrovalvola,
        AEREA_2: fakeElettrovalvola,
        AEREA_3: fakeElettrovalvola,
        AEREA_4: fakeElettrovalvola,
        AEREA_5: fakeElettrovalvola,
        AEREA_6: fakeElettrovalvola,
        AEREA_7: fakeElettrovalvola
    }
}

const SCHEDULER_PROCCESS_NAME = "irrigate";

/**
 * Crea la struttura dati per la gestione delle aree e inserisce le aree di default
 * @param {*} db 
 * @param {*} onSuccess 
 */
function inizializeAreas(db, callback) {


    var query = "CREATE TABLE IF NOT EXISTS areas (id INTEGER PRIMARY KEY, name TEXT, active TEXT, duration INTEGER, enable TEXT)";

    db.run(query, [], function (err) {

        var query = "INSERT INTO 'areas'\
                    SELECT 1 AS 'id', 'Zona 1' AS 'name', 'N' AS active, 0 AS duration, 'Y' as enable\
                    UNION ALL SELECT 2, 'Zona 2','N',0,'Y'\
                    UNION ALL SELECT 3, 'Zona 3','N',0,'Y'\
                    UNION ALL SELECT 4, 'Zona 4','N',0,'Y'\
                    UNION ALL SELECT 5, 'Zona 5','N',0,'Y'\
                    UNION ALL SELECT 6, 'Zona 6','N',0,'Y'\
                    UNION ALL SELECT 7, 'Zona 7','N',0,'Y'";
        //UNION ALL SELECT 8, 'Zona 8','N',0,'Y'";



        db.run(query, [], function (err) {
            if (err) {
                if ("SQLITE_CONSTRAINT: UNIQUE constraint failed: areas.id" == err.message) {
                    logger.info("Areas alredy exists.")
                } else {
                    logger.error(err.message);
                }

            } else {
                logger.info("Areas created.")
            }

            if (callback) {
                callback();
            }
        });
    });
}

function getAllAreas(db, callback) {

    db.all("SELECT * FROM areas", [], (err, rows) => {
        if (err) {
            logger.error(err.message);
            rows = [];
        }

        if (callback) {
            callback(rows);
        }
    });
}


function updateArea(db, area, callback) {
    var queryParams = [];
    var updateQuery = "UPDATE areas SET ";

    var i = 0;
    for (var property in area) {
        if (property == "id") {
            continue;
        }

        if (i > 0) {
            updateQuery += ",";
        }

        updateQuery += property + " = ? ";
        queryParams.push(area[property]);
        i++;
    }

    updateQuery += "WHERE id = ?"
    queryParams.push(area.id)

    db.run(updateQuery, queryParams, function (err) {
        if (err) {
            logger.info(err.message);
        }

        if (callback) {
            callback(err);
        }

    });
}

/**
 * Dato l'id ritorna l'area
 * @param {*} db 
 * @param {*} id 
 * @param {*} onSuccess 
 */
function getAreaById(db, id, onSuccess) {

    db.get("SELECT * FROM areas WHERE id=?", [id], (err, row) => {
        if (err) {
            logger.error(err.message);
            row = {};
        }

        if (onSuccess) {
            onSuccess(row);
        }
    });
}

/**
 * Rischedula l'impianto di irrigazione
 * Cancella tutte le schedulazioni precedenti e schedula la nuova
 */
function rescheduleIrrigation(dbUtils) {
    logger.info("Rescheduling irrigation...");

    //cancello tutte le irrigazioni precedenti
    if (schedule.scheduledJobs.irrigate) {
        schedule.scheduledJobs.irrigate.cancel();
    }


    var schedulerEnable = dbUtils.getAppParameter(consts.PARAM_SCHEDULER_ENABLE) || "N";
    var scheulerTime = dbUtils.getAppParameter(consts.PARAM_SCHEDULER_TIME) || "";

    if (schedulerEnable == "Y") {

        var timeComponent = scheulerTime.split(":");
        if(timeComponent.length != 2){
            logger.error("Invalid scheduler time: " + scheulerTime);
            return;
        }

        logger.info("Next irrigation at: " + scheulerTime);

        var rule = new schedule.RecurrenceRule();
        //rule.dayOfWeek = [1, 2, 3, 4, 5];
        rule.hour = timeComponent[0];
        rule.minute = timeComponent[1];

        var j = schedule.scheduleJob(SCHEDULER_PROCCESS_NAME, rule, function () {
            

            //https://openweathermap.org/weather-conditions
            if(weatherUtils && weatherUtils.info.weather && weatherUtils.info.weather[0] && weatherUtils.info.weather[0].id < 622){
                logger.info("\n**********************************************************************");
                logger.info("Irrigation abborted at: " + new Date());
                logger.info("Weather: " + weatherUtils.info.weather[0].main);
                logger.info("\n**********************************************************************");
            }else{
                startIrrigation(dbUtils);
            }
            
        });
    }
}


function startIrrigation(dbUtils){
    
    var schedulerInProgress = dbUtils.getAppParameter(consts.PARAM_SCHEDULER_IN_PROGRESS);
    if(schedulerInProgress){
        return false;
    }

    dbUtils.setAppParameter(consts.PARAM_SCHEDULER_IN_PROGRESS, true);
    logger.info("\n**********************************************************************");
    logger.info("Irrigation is starting at: " + new Date());
    logger.info("\n**********************************************************************");
    powerReleCard(true);
    openMasterGPIO();
    irrigateAreasRecursively(dbUtils, 1);

    return true;
}

/**
 * Avvia l'impianto di irrigazione per una zona, poi passa alla successiva
 * @param {*} dbUtils 
 * @param {*} areaId 
 */
function irrigateAreasRecursively(dbUtils, areaId) {
     
    if (areaId > consts.AREAS_COUNT) {
        //ho fatto tutte le zone...fine della fiera
        closeMasterGPIO();
        powerReleCard(false);
        logger.info("Irrigation ended!");
        dbUtils.setAppParameter(consts.PARAM_SCHEDULER_IN_PROGRESS, false);
        return;
    }

    logger.info("__________________________________");
    logger.info("%s Check area %s ", dateFormat(new Date(), "hh:MM:ss"), areaId);

    //se è stato fermato lo schedulatore questa variabile varrà false
    var schedulerInProgress = dbUtils.getAppParameter(consts.PARAM_SCHEDULER_IN_PROGRESS);

    //recupero testata area
    getAreaById(dbUtils.db, areaId, (area) => {
        if (area.enable != "Y" || !(area.duration > 0) || !schedulerInProgress) {
            //l'area è disabilitata, passo alla prossima
            logger.info(" - Area %s disabled.", areaId);
            irrigateAreasRecursively(dbUtils, areaId + 1);
        } else {
            logger.info(" - Area %s start irrigate for %s minutes.", areaId, area.duration);
            openGPIOForArea(areaId);
            area.active = 'Y';
            updateArea(dbUtils.db, area);

            //imposto la durata dell'irrigazione
            setTimeout(() => {
                closeGPIOForArea(areaId);
                area.active = 'N';
                updateArea(dbUtils.db, area);
                irrigateAreasRecursively(dbUtils, areaId + 1);
            }, area.duration * 60 * 1000);

        }
    });
}


/**
 * Apre l'elettrovalvola per l'area indicata
 * @param {*} area 
 */
function openGPIOForArea(areaId) {
    ELETTROVALVOLE["AEREA_" + areaId].writeSync(GPIO_OFF);
}

/**
 * Chiude l'elttrovalvola per l'area indicata
 * @param {*} area 
 */
function closeGPIOForArea(areaId) {
    ELETTROVALVOLE["AEREA_" + areaId].writeSync(GPIO_ON);
}


/**
 * Apre l'elettrovalvola principale
 */
function openMasterGPIO() {
    console.warn("%s Open master GPIO ", dateFormat(new Date(), "hh:MM:ss"));
    ELETTROVALVOLE.MASTER.writeSync(GPIO_OFF);
}

/**
 * Chiude lelettrovalvola principale
 */
function closeMasterGPIO() {
    logger.info("%s Close master GPIO ", dateFormat(new Date(), "hh:MM:ss"));
    ELETTROVALVOLE.MASTER.writeSync(GPIO_ON);
}

/**
 * 
 * @param {*} power  true accessa, false spenta
 */function powerReleCard(power){
     ELETTROVALVOLE.MASTER.writeSync(power ? GPIO_ON : GPIO_OFF);
     ELETTROVALVOLE.AEREA_1.writeSync(power ? GPIO_ON : GPIO_OFF);
     ELETTROVALVOLE.AEREA_2.writeSync(power ? GPIO_ON : GPIO_OFF);
     ELETTROVALVOLE.AEREA_3.writeSync(power ? GPIO_ON : GPIO_OFF);
     ELETTROVALVOLE.AEREA_4.writeSync(power ? GPIO_ON : GPIO_OFF);
     ELETTROVALVOLE.AEREA_5.writeSync(power ? GPIO_ON : GPIO_OFF);
     ELETTROVALVOLE.AEREA_6.writeSync(power ? GPIO_ON : GPIO_OFF);
     ELETTROVALVOLE.AEREA_7.writeSync(power ? GPIO_ON : GPIO_OFF);
     ELETTROVALVOLE.POWER_SCHEDA.writeSync(power ? GPIO_ON : GPIO_OFF);
}

exports.inizializeAreas = inizializeAreas;
exports.getAllAreas = getAllAreas;
exports.getAreaById = getAreaById;
exports.updateArea = updateArea;
exports.rescheduleIrrigation = rescheduleIrrigation;
exports.startIrrigation = startIrrigation;
exports.openGPIOForArea = openGPIOForArea;
exports.closeGPIOForArea = closeGPIOForArea;
exports.openMasterGPIO = openMasterGPIO;
exports.closeMasterGPIO = closeMasterGPIO;
exports.powerReleCard = powerReleCard;