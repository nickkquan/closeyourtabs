const express = require('express');
const router = express.Router();
const path = require('path');
const mysqlCredentials = require('../mysqlCredentials');
const mysql = require('mysql');
const db = mysql.createConnection(mysqlCredentials);
const { ensureAuthenticated } = require('../helper/auth');

db.connect((err) => {
    if (err) throw err;
    console.log("Connected to remote DB");
});

function checkIfTableExists(req, res, next) {
    db.query(
        "CREATE TABLE IF NOT EXISTS tabs (" +
        "databaseTabID MEDIUMINT(8) NOT NULL PRIMARY KEY AUTO_INCREMENT," +
        "windowID MEDIUMINT(8) NULL ," +
        "tabTitle VARCHAR(200) NULL," +
        "activatedTime double NULL," +
        "deactivatedTime double NULL," +
        "browserTabIndex int(10) NULL," +
        "googleID double NULL," +
        "url VARCHAR(2084) NULL," +
        "favicon VARCHAR(2084) NULL );",
        (err) => {
            if (err) throw err;
        }
    );
    next();
}

router.get('/', ensureAuthenticated, (req, res) => {

    const query = 'SELECT * FROM tabs WHERE googleID=?';
    const insert = req.user;
    const sql = mysql.format(query, insert);

    db.query(sql, function (err, results) {
        if (err) console.log('Error, GET: ', err);
        const output = {
            type: 'GET',
            success: true,
            data: results
        };
        const json_output = JSON.stringify(output);
        res.send(json_output);
        console.log('GET from: ', req.user);
    });
});

router.post('/', ensureAuthenticated, checkIfTableExists, (req, res) => {
    const googleID = req.user;
    const { windowID, tabTitle, activatedTime, deactivatedTime, browserTabIndex, url, favicon } = req.body;

    const query = 'INSERT INTO ?? (??, ??, ??, ??, ??, ??, ??, ??) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const insert = ['tabs', 'windowID', 'tabTitle', 'activatedTime', 'deactivatedTime', 'browserTabIndex', 'googleID', 'url', 'favicon',
        windowID, tabTitle, activatedTime, deactivatedTime, browserTabIndex, googleID, url, favicon];
    const sql = mysql.format(query, insert);

    db.query(sql, (err, results, fields) => {
        if (err) console.log('Error, POST: ', err);
        const output = {
            type: 'POST',
            success: true,
            affectedRows: results.affectedRows,
            insertId: results.insertId,
            fields: fields
        };
        console.log('POST from ', googleID, 'Data: ', output);
        const json_output = JSON.stringify(output);
        res.send(json_output);
    });
});

router.delete('/:deleteID', ensureAuthenticated, (req, res) => {

    let searchType;
    let searchID;

    if (req.params.deleteID === 'google') {
        searchID = req.user;
        searchType = 'googleID'
    }
    if (req.params.deleteID === 'database') {
        searchID = req.body.databaseTabID;
        searchType = 'databaseTabID';
    }

    const query = 'DELETE FROM tabs WHERE ?? = ?';
    const insert = [searchType, searchID];
    const sql = mysql.format(query, insert);

    db.query(sql, (err, results, fields) => {
        if (err) console.log('Error, DELETE: ', err);
        const output = {
            type: 'DELETE',
            success: true,
            data: results,
            fields: fields
        };
        console.log('DELETE data: ', output);
        const json_output = JSON.stringify(output);
        res.send(json_output);
    });
});

router.put('/', ensureAuthenticated, checkIfTableExists, (req, res) => {
    const { databaseTabID, tabTitle, browserTabIndex, url, favicon } = req.body;

    const query = 'UPDATE tabs SET tabTitle=?, browserTabIndex=?, url=?, favicon=? WHERE databaseTabID = ? LIMIT 1';
    const insert = [tabTitle, browserTabIndex, url, favicon, databaseTabID];
    const sql = mysql.format(query, insert);

    db.query(sql, (err, results, fields) => {
        if (err) console.log('Error, UPDATE: ', err);
        const output = {
            type: 'UPDATE',
            success: true,
            data: results.message,
            fields: fields
        };
        console.log('UPDATE data: ', output);
        const json_output = JSON.stringify(output);
        res.send(json_output);
    });
});

router.put('/move', ensureAuthenticated, (req, res) => {
    const { databaseTabID, browserTabIndex } = req.body;

    const query = 'UPDATE tabs SET browserTabIndex=? WHERE databaseTabID = ? LIMIT 1';
    const insert = [browserTabIndex, databaseTabID];
    const sql = mysql.format(query, insert);

    db.query(sql, (err, results, fields) => {
        if (err) console.log('Error, UPDATE[MOVE]: ', err);
        const output = {
            type: 'UPDATE - TAB MOVED',
            success: true,
            data: results.message,
            fields: fields
        }
        console.log(output);
        const json_output = JSON.stringify(output);
        res.send(json_output);
    });
});

router.put('/:time', ensureAuthenticated, checkIfTableExists, (req, res) => {

    let time = new Date();
    time = time.getTime();

    const { databaseTabID, url } = req.body;

    let domain = (url).match(/([a-z0-9|-]+\.)*[a-z0-9|-]+\.[a-z]+/g) || (url).match(/^(chrome:)[//]{2}[a-zA-Z0-0]*/);
    domain = domain[0];

    if (req.params.time === 'deactivatedTime' && url) {

        const getActiveTimeQuery = 'SELECT * FROM tabs WHERE databaseTabID = ? LIMIT 1';
        const getActiveTimeInsert = databaseTabID;
        const getActiveTimeSQL = mysql.format(getActiveTimeQuery, getActiveTimeInsert);

        db.query(getActiveTimeSQL, (err, results) => {

            const storedActiveTime = results.activatedTime;
            let newActiveTime = time - storedActiveTime;

            const createUrlTableSQL = "CREATE TABLE IF NOT EXISTS urls (" +
                "databaseUrlID MEDIUMINT(8) NOT NULL PRIMARY KEY," +
                "googleID DOUBLE NULL," +
                "url VARCHAR(200) NULL," +
                "totalActiveTime INT(20) NULL);";

            db.query(createUrlTableSQL, (err) => {
                if (err) console.log(err);

                const activeTimeQuery = 'SELECT * FROM urls WHERE googleID=? AND url=? LIMIT 1';
                const activeTimeInsert = [req.user, domain];
                const activeTimeSQL = mysql.format(activeTimeQuery, activeTimeInsert);

                db.query(activeTimeSQL, (err, results) => {

                    if (results.length > 0) {

                        let newActiveTime = results.totalActiveTime + newActiveTime;

                        const updateActiveTimeQuery = 'UPDATE urls SET totalActiveTime = ? WHERE databaseUrlID= ? LIMIT 1';
                        const updateActiveTimeInsert = [newActiveTime, results.databaseUrlID];
                        const updateActiveTimeSQL = mysql.format(updateActiveTimeQuery, updateActiveTimeInsert);

                        db.query(updateActiveTimeSQL, (err) => {
                            if (err) console.log(err)
                            console.log('UPDATED URL in table: domain: ', domain, ', time: ', newActiveTime);
                        });

                    } else {

                        const insertUrlQuery = 'INSERT INTO urls (googleID, url, totalActiveTime) VALUES (? ? ?))'
                        const insertUrlInsert = [req.user, domain, newActiveTime];
                        const insertUrlSQL = mysql.format(insertUrlQuery, insertUrlInsert);

                        db.query(insertUrlSQL, (err, results) => {
                            if (err) console.log(err);
                            console.log(results);
                            console.log('CREATED URL in table, domain: ', domain, ', time: ', newActiveTime);
                        });

                    }
                })
            })
        })
    };

    const query = 'Update tabs SET ?? = ? WHERE databaseTabID = ? LIMIT 1';
    const insert = [req.params.time, time, databaseTabID];

    const sql = mysql.format(query, insert);

    db.query(sql, (err, results, fields) => {
        if (err) console.log('Error, TIMEUPDATE: ', err);
        const output = {
            type: req.params.time,
            success: true,
            data: results.message,
            fields: fields
        };
        console.log('UPDATE TIMESTAMP type: ', req.params.time, ' data: ', output);
        const json_output = JSON.stringify(output);
        res.send(json_output);
    });
});

module.exports = router;
