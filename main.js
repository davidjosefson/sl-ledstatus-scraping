var mongoose = require('mongoose');
var request = require('request');
var mongo = require('./mongo').Section;
var winston = require('winston');
var async = require('async');

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

winston.log('info', 'Runing main!');

async.series(
    [
        function(callback){
            dropReportsCollectionInMongoDB(function(error){
                callback();
            });
        },
        function(callback){
            getJsonAddToMongo(function(error){
                callback();
            });
        }
    ]);

function getJsonAddToMongo(callbackWhenDone) {
    // dropReportsCollectionInMongoDB(function(error) {
    // console.log('Kommer till getJson-callback, före iferror');
    // if (!error)  {
    //     console.log('Kommer till getJson-callback');
    var jsonResult;

    request(importIOurl, function(error, response, body) {
        if (!error) {
            try {
                jsonResult = JSON.parse(response.body);
                preparedFaults = prepareFaults(jsonResult.results);
                addToMongo(preparedFaults);
            } catch (e) {
                winston.log('error', 'Error when parsing json form import.io: ', e.toString());
            }
        } else  {
            winston.log('error', 'Error received when requesting importIOurl: ', error.toString());
        }
        callbackWhenDone(null, 'testresult');
    });


    // }
    // });
}

function dropReportsCollectionInMongoDB(callbackWhenDone) {
    mongoose.connect(mongoConnectUrl);

    console.log('Kommer till dropReports()');
    mongo.remove({}, function(err) {
        if (!err) {
            console.log('Kommer till dropReports !err');
            winston.log('info', 'Removed existing content of skaneleden_report from mongodb');
            callbackWhenDone(null, 'dropResult');
        } else {
            console.log('Kommer till dropReports else error');
            winston.log('error', 'Failed to remove existing content of skaneleden_report from mongodb');
            callbackWhenDone('Error when trying to remove the existing content from mongodb', null);
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

function addToMongo(preparedFaults) {
    try {


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

            mongoose.connection.close();

        });
    } catch (e) {
        winston.log('error', 'Error when trying to connect and add data to mongodb', e.toString());
    }

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
