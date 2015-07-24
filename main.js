var mongoose = require('mongoose');
var request = require('request');
var mongo = require('./mongo').Section;
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

function connectToMongo(callbackWhenDone) {
    try {
        mongoose.connect(mongoConnectUrl, function() {
            winston.log('info', 'Connected to mongoDB');
            callbackWhenDone();
        });
    } catch (e) {
        winston.log('error', 'Error when trying to connect to mongoDB', e.toString());
    }
}


function run()  {
    async.series(
        [
            function(next){
                mongoose.connect(mongoConnectUrl, function(err){
                    if(!err){
                        winston.log('info', 'Connected to mongoDB');
                    }else {
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
            function(next) {
                console.log('Closing connection..');
                mongoose.connection.close(function() {
                    winston.log('info', 'Closed mongo connection');
                });
                next();
            }
        ]
    );
}

function dropReportsCollectionInMongoDB(callbackWhenDone) {
    mongo.remove({}, function(err) {
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
                // console.log('added fault');
            } else {
                winston.log('error', 'Error when trying to save fault for ', fault.sectionId, ' to mongo');
                // console.log('didnt add fault');
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


function add(response, iter) {
    var object = {
        provider: 'Skåneleden',
        id: getId(response.etapp, response.led),
        trail: response.led,
        trailName: response.led.substring(6, response.led.length),
        trailId: response.led.substring(3, 4),
        section: response.etapp,
        sectionName: getName(response.etapp),
        sectionId: transformSection(response.etapp.substring(0, 3)),
        length: response.langd,
        difficulty: fixDifficulty(response.gradering),
        rating: response.betyg,
        trivia: response.kort_beskrivning,
        nature: response.natur,
        culture: response.kulturhistoria,
        url: response.url,
        pdfFile: response.pdfinformation,
        gpxFile: response.gpxfil
    };

    var newSection = new mongo(object);
    newSection.save(function(err) {
        if (!err)
            console.log('saved');
        else
            console.log('not saved');
    });
}

//Disconnects mongoDB when application terminates
process.on('SIGINT', function() {
    mongoose.connection.close(function() {
        process.exit(0);
    });
});
