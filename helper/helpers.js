const { mysqlCredentials } = require('../config/keys');
const mysql = require('mysql');
const db = mysql.createConnection(mysqlCredentials);

module.exports = {
    ensureAuthenticated: function (req, res, next) {
        console.log(req);
        console.log(req.user);
        if (req.user) {
            console.log('req.user: ', req.user.givenName);
            return next();
        } else {
            console.log('This is the ensureAuthentication saying that the user is not autheticated.');
            res.send({
                success: false,
                message: 'Authentication failed, no user present.'
            })
        }
    },
    checkIfTableExists: function (req, res, next) {
        let sql = "CREATE TABLE IF NOT EXISTS tabs (" +
            "databaseTabID MEDIUMINT(8) NOT NULL PRIMARY KEY AUTO_INCREMENT," +
            "windowID MEDIUMINT(8) NULL ," +
            "tabTitle VARCHAR(200) NULL," +
            "activatedTime double NULL," +
            "deactivatedTime double NULL," +
            "browserTabIndex int(10) NULL," +
            "googleID double NULL," +
            "url VARCHAR(2084) NULL," +
            "favicon VARCHAR(2084) NULL," +
            "screenshot VARCHAR(50000) NULL);";
        db.query(sql, (err, results) => {
            if (err) throw err;
            console.log("results", results);
            next();
        });
    },
    updateUrlTable: function (databaseTabID, user) {

        const getActiveTimeQuery = 'SELECT * FROM tabs WHERE databaseTabID = ?';
        const getActiveTimeInsert = databaseTabID;
        const getActiveTimeSQL = mysql.format(getActiveTimeQuery, getActiveTimeInsert);

        db.query(getActiveTimeSQL, (err, results) => {
            if(err) throw err;

            const { url, activatedTime } = results[0];

            let domain = (url).match(/([a-z0-9|-]+\.)*[a-z0-9|-]+\.[a-z]+/g)
                || (url).match(/^(chrome:)[//]{2}[a-zA-Z0-0]*/)
                || (url).match(/^(localhost)/);
            domain = domain[0];

            let time = new Date();
            time = time.getTime();

            let newActiveTime = time - activatedTime;

            const createUrlTableSQL = "CREATE TABLE IF NOT EXISTS urls (" +
                "databaseUrlID MEDIUMINT(8) NOT NULL PRIMARY KEY AUTO_INCREMENT," +
                "googleID DOUBLE NULL," +
                "url VARCHAR(200) NULL," +
                "totalActiveTime INT(20) NULL);";

            db.query(createUrlTableSQL, (err) => {
                if (err) console.log(err);

                const activeTimeQuery = 'SELECT * FROM urls WHERE googleID=? AND url=?';
                const activeTimeInsert = [user.googleID, domain];
                const activeTimeSQL = mysql.format(activeTimeQuery, activeTimeInsert);

                db.query(activeTimeSQL, (err, results) => {

                    if (results.length > 0) {
                        newActiveTime = results[0].totalActiveTime + newActiveTime;
                        const updateActiveTimeQuery = 'UPDATE urls SET totalActiveTime = ? WHERE databaseUrlID= ?';
                        const updateActiveTimeInsert = [newActiveTime, results.databaseUrlID];
                        const updateActiveTimeSQL = mysql.format(updateActiveTimeQuery, updateActiveTimeInsert);
                        db.query(updateActiveTimeSQL, (err) => {
                            if (err) console.log(err)
                            console.log('UPDATED URL in table: domain: ', domain, ', time: ', newActiveTime);
                        });

                    } else {
                        const insertUrlQuery = 'INSERT INTO urls (googleID, url, totalActiveTime) VALUES (?, ?, ?)'
                        const insertUrlInsert = [user.googleID, domain, newActiveTime];
                        const insertUrlSQL = mysql.format(insertUrlQuery, insertUrlInsert);
                        db.query(insertUrlSQL, (err, results) => {
                            if (err) console.log(err);
                            console.log('CREATED URL in table, domain: ', domain, ', time: ', newActiveTime);
                        });
                    }
                })
            })
        })
    },
    produceOutput: function (err, result, location) {
        const output = {
            type: location,
            success: false,
            data: result,
        };
        if (err) {
            output.message = 'Failed to get tab info';
        } else {
            if (result.length > 0) {
                output.code = '200';
                output.success = true;
            } else {
                output.code ='404';
                output.message = 'No data for user';
            }
        }
        if(location === 'GET'){
            console.log('');
        } else {
            console.log(output);
        }
        const json_output = JSON.stringify(output);
        return json_output;  
    },
};