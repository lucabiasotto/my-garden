/**
 * Modulo per gestione connessioni al database
 */
var consts = require('./consts')
const sqlite3 = require('sqlite3').verbose();
var nconf = require('nconf');
var logger = require('./logger');

var DB_CURRENT_VERSION = 1;

var dataPath = process.env.DATA_PATH || ".";
var dbName = dataPath + "/db/mygarden.db";
var settingsName = dataPath + "/settings/config.json"


nconf.use('file', { file: settingsName });
nconf.load();


var db;


/**
 * Apre connessione al db, lo crea se non esiste
 */
function openDbConnection(onSuccess, onError) {

    logger.info('Connecting to database: ' + dbName);
    //si connette al db e lo apre se non esiste
    db = new sqlite3.Database(dbName, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            if (onError) {
                onError(err);
            }
            return logger.error(err.message);
        }

        logger.info('Database conntected!');
        if (onSuccess) {
            onSuccess(db);
        }
    });

    exports.db = db;
}

/**
 * Chiude connessione con il db
 */
function closeDbConnection() {
    // close the database connection
    db.close((err) => {
        if (err) {
            return logger.error(err.message);
        }
        logger.info('Close the database connection.');
    });
}

/**
 * Inizializza il db, creando tabelle e parametri
 * @param {*} onSuccess 
 */
function inizializeDb(onSuccess) {

    //CREA TABELLA SETTINGS
    var query = "CREATE TABLE IF NOT EXISTS settings (param_name TEXT PRIMARY KEY, param_value TEXT);";
    db.run(query, [], function (err) {
        if (err) {
            throw err.message;
        }

        var dbVersion = getAppParameter(consts.PARAM_DB_VERSION);

        if (dbVersion < 2) {
            //TODO ecc ecc
        }

        setAppParameter(consts.PARAM_DB_VERSION, DB_CURRENT_VERSION);

        if (onSuccess) {
            onSuccess(true);
        }

    });

}


function getAppParameter(key) {
    return nconf.get(key);
}

function setAppParameter(key, value) {
    nconf.set(key, value);
    nconf.save(function (err) {
        if (err) {
          logger.error("Impossibile aggiornre il parametro: " + err.message);
          return;
        }
      });
}


exports.inizializeDb = inizializeDb;
exports.openDbConnection = openDbConnection;
exports.closeDbConnection = closeDbConnection;
exports.getAppParameter = getAppParameter;
exports.setAppParameter = setAppParameter;

