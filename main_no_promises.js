//TODO:
//- fixa errorhanteringen så att den verkligen funkar, nu är det ett härke av try catchar och callbacks..
//- eller åtminstone, kolla så att det verkar vattentätt

var mongoose = require('mongoose');
var request = require('request');
var skaneleden_report = require('./mongo').Section;
var winston = require('winston');
var async = require('async');
var q = require('q');

var importIOurl = "***REMOVED***";
var mongoConnectUrl = '***REMOVED***';
// mongoose.connect('***REMOVED***');


winston.add(winston.transports.File, {
    filename: 'winstonError.log'
});

var sectionMap = {};
sectionMap['Kust-kustleden'] = 1;
sectionMap['Nord-sydleden'] = 2;
sectionMap['Ås-åsleden'] = 3;
sectionMap['Österlenleden'] = 4;
sectionMap['Öresundsleden'] = 5;

winston.log('info', 'Running main!');

run();

function run()  {
    async.series(
        [
            function(next) {
                winston.log('info', 'Connecting to mongo..');
                mongoose.connect(mongoConnectUrl, function(err) {
                    if (!err) {
                        winston.log('info', 'Connected to mongoDB!');
                    } else {
                        winston.log('error', 'Connection to mongoDB failed with the following error: ', err.toString());
                    }
                    next();
                });
            },
            function(next) {
                dropReportsCollectionInMongoDB(next);
            },
            function(next) {
                getJsonAddToMongo(next);
            },
            function(done) {
                winston.log('info', 'Disconnecting from Mongo..');
                mongoose.connection.close(function() {
                    winston.log('info', 'Mongo disconnected!');
                });
                done();
            }
        ]
    );
}

// function connectToMongo(callbackWhenDone) {
//     try {
//         mongoose.connect(mongoConnectUrl, function() {
//             winston.log('info', 'Connected to mongoDB');
//             callbackWhenDone();
//         });
//     } catch (e) {
//         winston.log('error', 'Error when trying to connect to mongoDB', e.toString());
//     }
// }

function dropReportsCollectionInMongoDB(callbackWhenDone) {
    skaneleden_report.remove({}, function(err) {
        if (!err) {
            winston.log('info', 'Removed existing content of skaneleden_report from mongodb');
        } else {
            winston.log('error', 'Failed to remove existing content of skaneleden_report from mongodb');
        }

        callbackWhenDone();
    });
}

function getJsonAddToMongo(callbackWhenDone) {
    var jsonResult;

    request(importIOurl, function(error, response, body) {
        if (!error) {
            try {
                jsonResult = JSON.parse(response.body);
                preparedFaults = prepareFaults(jsonResult.results);
                addToMongo(preparedFaults, function() {
                    callbackWhenDone();
                });
            } catch (e) {
                winston.log('error', 'Error when parsing json form import.io: ', e.toString());
            }
        } else  {
            winston.log('error', 'Error received when requesting importIOurl: ', error.toString());
        }
    });
}

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

function addToMongo(preparedFaults, callbackWhenDone) {
    // try {
    async.each(preparedFaults, function(fault, faultDone)  {
        var newSection = new mongo(fault);
        newSection.save(function(err) {
            if (!err) {
                winston.log('info', 'Added fault for ', fault.sectionId);
            } else {
                winston.log('error', 'Error when trying to save fault for ', fault.sectionId, ' to mongo');
            }
            faultDone();
        });
    }, function(err) {
        if (!err) {
            winston.log('info', 'All faults added');
        } else {
            winston.log('error', 'Error after async has made some magic', JSON.stringify(err));
        }

        // mongoose.connection.close();
        callbackWhenDone();
    });

    // } catch (e) {
    //     winston.log('error', 'Error when trying add data to mongodb', e.toString());
    // }

}

//Disconnects mongoDB when application terminates
process.on('SIGINT', function() {
    mongoose.connection.close(function() {
        winston.log('info', 'Disconnected MongoDB after node unexpectedly was terminated!');
        process.exit(0);
    });
});