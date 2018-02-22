const express = require('express');
const router = express.Router();
const path = require('path');
const mysqlCredentials = require('../mysqlCredentials');
const mysql = require('mysql');
const db = mysql.createConnection(mysqlCredentials);
const { ensureAuthenticated } = require('../helper/auth');
const { checkIfTableExists } = require('../helper/checkIfTableExists');

db.connect((err) => {
    if (err) throw err;
    console.log("Connected to remote DB");
});

router.get('/', ensureAuthenticated, (req, res) => {

    const query = 'SELECT * FROM tabs WHERE googleID=?';
    const insert = req.user;
    const sql = mysql.format(query, insert);

    db.query(sql, function (err, results, ) {
        if (err) console.log('Error, GET: ', err);
        const output = {
            type: 'GET',
            success: true,
            data: results.message
        };
        const json_output = JSON.stringify(output);
        res.send(json_output);
        console.log('GET from: ', req.body.googleID);
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

    const { databaseTabID } = req.body;

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


    // db.query("CREATE TABLE IF NOT EXISTS urls (" +
    //         "googleID double NOT NULL PRIMARY KEY," +
    //         "url VARCHAR(30) NULL," +
    //         "totalActive INT(20) NULLl);", 
    //         (err) => {
    //             if (err) console.log(err);
    //             db.query(insertUser, (err) => {
    //                 if (err) console.log(err);
    //                 console.log('User was not in db, but is now');
    //                 return done(null, newUser);
    //             });
    //         }
    // );


    // db.query()






});

module.exports = router;
