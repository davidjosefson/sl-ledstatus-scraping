var bluebird = require('bluebird');
var mongoose = bluebird.promisifyAll(require('mongoose'));
var request = bluebird.promisifyAll(require('request'));
var winston = bluebird.promisifyAll(require('winston'));
var skaneleden_report = require('./mongo').Section;

var importIOurl = "***REMOVED***";
// var mongoConnectUrl = '***REMOVED***';
var mongoConnectUrl = '***REMOVED***';

//Adding log file to write info and errors to
winston.add(winston.transports.File, {
    filename: 'winstonError.log'
});

var sectionMap = {};
sectionMap['Kust-kustleden'] = 1;
sectionMap['Nord-sydleden'] = 2;
sectionMap['Ås-åsleden'] = 3;
sectionMap['Österlenleden'] = 4;
sectionMap['Öresundsleden'] = 5;

winston.log('info', 'Connecting to mongo..');

mongoose.connectAsync(mongoConnectUrl)
    .then(function() {
        winston.log('info', 'Connected to mongo');
        winston.log('info', 'Removing existing data from mongo and requesting data from import.io (async operations)..');

        //Removing mongo data and fetching import.io-data simultaneously
        return bluebird.join(skaneleden_report.remove({}), request.getAsync(importIOurl), function(removemessage, requestResponse) {
            return requestResponse;
        });
    })
    .then(function(requestResponse) {
        winston.log('info', 'Requested data was fetched');
        winston.log('info', 'Trying to parse JSON-data..');

        //Parsing json
        faults = JSON.parse(requestResponse[0].body).results;

        winston.log('info', 'Parsing successful');

        return prepareFaults(faults);
    })
    .then(function(faults) {
        winston.log('info', 'Preparing to save each fault to mongo..');

        var mongoSaves = [];

        //Storing each mongo-save in an array
        for (var i = 0; i < faults.length; i++) {
            fault = faults[i];
            var report = new skaneleden_report(fault);
            mongoSaves.push(report.save());
        }

        winston.log('info', 'Saving all faults to mongo');

        //Running all saves() simultaneously
        return bluebird.all(mongoSaves);
    })
    .catch(SyntaxError, function(err) {
        winston.log('error', 'Failed to parse fetched JSON: ', err);
    })
    .catch(function(err) {
        winston.log('error', 'Something went wrong, here is the error received: ', err);
    })
    .finally(function(result) {
        winston.log('info', 'All done');
        winston.log('info', 'Closing mongo connection');

        return mongoose.connection.close();
    });

//Cleaning the fetched json data to fit the mongo schema
function prepareFaults(json) {
    var preparedFaults =   [];

    for (var i = 0; i < json.length; i++) {
        preparedFault = renameKeysAddSectionId(json[i]);
        preparedFaults.push(preparedFault);
    }

    return preparedFaults;
}

function renameKeysAddSectionId(fault) {
    preparedFault = {};

    preparedFault.report = fault.avvikelse;
    preparedFault.trail = fault.del_led;
    preparedFault.section = fault.etapp;
    preparedFault.sectionId = 'SL' + sectionMap[fault.del_led] + 'E' + fault.etapp;

    return preparedFault;
}