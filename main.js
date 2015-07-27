var credentials = require('./credentials');
var skaneleden_report = require('./mongo');
var bluebird = require('bluebird');
var mongoose = bluebird.promisifyAll(require('mongoose'));
var request = bluebird.promisifyAll(require('request'));
var winston = bluebird.promisifyAll(require('winston'));

//Credentials
var SLACKWEBHOOK_URL = credentials.slack.url;
var MONGOLAB_URL = credentials.mongo.url;
var MONGOLAB_OPTIONS = {
    user: credentials.mongo.user,
    pass: credentials.mongo.pass
};
var IMPORTIO_URL = credentials.importio.url;

//For posting to Slack using the slack webhook
var slack = require('slack-notify')(SLACKWEBHOOK_URL);

//Adding log file to write info and errors to
winston.add(winston.transports.File, {
    filename: './ledstatus-scraping.log'
});

var sectionMap = {};
sectionMap['Kust-kustleden'] = 1;
sectionMap['Nord-sydleden'] = 2;
sectionMap['Ås-åsleden'] = 3;
sectionMap['Österlenleden'] = 4;
sectionMap['Öresundsleden'] = 5;


winston.log('info', 'Connecting to mongo..');

mongoose.connectAsync(MONGOLAB_URL, MONGOLAB_OPTIONS)
    .then(function() {
        winston.log('info', 'Connected to mongo');
        winston.log('info', 'Removing existing data from mongo and requesting data from import.io (async operations)..');

        //Removing mongo data and fetching import.io-data simultaneously
        return bluebird.join(skaneleden_report.remove({}), request.getAsync(IMPORTIO_URL), function(removemessage, requestResponse) {
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
    .then(function() {
        postMessageOnSlack('Fetching done, no errors');
        winston.log('info', 'All done, no errors');
    })
    .catch(SyntaxError, function(err) {
        postMessageOnSlack(err.toString());
        winston.log('error', 'Failed to parse fetched JSON: ', err);
    })
    .catch(function(err) {
        postMessageOnSlack(err.toString());
        winston.log('error', 'Something went wrong, here is the error received: ', err);
    })
    .finally(function(result) {
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

function postMessageOnSlack(message) {
    var today = new Date();

    slack.send({
        channel: '#loggning',
        text: today.toUTCString() + ': ' + message,
        unfurl_links: 1,
        username: 'Autofetch ledstatus'
    });
}