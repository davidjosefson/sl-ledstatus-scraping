//TODO:
//- fixa errorhanteringen så att den verkligen funkar, nu är det ett härke av try catchar och callbacks..
//- eller åtminstone, kolla så att det verkar vattentätt

var mongoose = require('mongoose');
var request = require('request');
var mongo = require('./mongo').Section;
var winston = require('winston');
var async = require('async');
var q = require('q');
// var mongoose = require('mongoose-q')(require('mongoose'));

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

mongoose.connect(mongoConnectUrl, function() {
    console.log('Connected!');
});

// q.invoke(mongo, 'remove', {})
//     .then(function() {
//         return q.nfcall(request, 'get', importIOurl);
//     })
q.nfcall(request, importIOurl)
    .then(function(response) {
        try {
            json = JSON.parse(response[0].body);
            return json.results;
        } catch (e) {
            throw e;
        }
    })
    .then(function(json) {
        return prepareFaults(json);
    })
    .then(function(json) {
        console.log(json);
    })
    .then(function() {
        return q.ninvoke(mongoose.connection, 'close');
    })
    .fail(function(err) {
        console.log('Error!! : ', err);
    });

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

// q.ninvoke(mongo, 'count', {})
//     .then(function(result) {
//         console.log(result);
//     })
//     .fail(function(err) {
//         console.log('Blev fail!');
//         console.log(err);
//     });

//
// q.ninvoke(mongo, 'remove')
//     .then(function() {
//         var fault = {
//             sectionId: '1111',
//             report: '1111',
//             trail: '111',
//             section: '1111'
//         };
//
//         var newSection = new mongo(fault);
//         return q.ninvoke(newSection, 'save');
//     })
//     .then(function() {
//         return q.ninvoke(mongo, 'count', {});
//     })
//     .then(function(count) {
//         console.log(count);
//     })
//     .then(function() {
//         var fault = {
//             sectionId: '222',
//             report: '2222',
//             trail: '222',
//             section: '2222'
//         };
//
//         var newSection = new mongo(fault);
//         return q.ninvoke(newSection, 'save');
//     })
//     .then(function() {
//         return q.ninvoke(mongo, 'count', {});
//     })
//     .then(function(count) {
//         console.log(count);
//     })
//     .fail(function(err) {
//         console.log(err);
//     });


// var fault = {
//     sectionId: 'ididid',
//     report: 'reportreportreport',
//     trail: 'trailtrailtrail',
//     section: 'sectionsectionsection'
// };
//
// var newSection = new mongo(fault);
// newSection.save(function(err, result) {
//     if (err) {
//         console.log(err);
//     } else {
//         console.log(result);
//     }
// });

// q.nfcall(newSection, 'save')
// .then(q.ninvoke(mongo, 'count', {}));

// function getJsonAddToMongo(callbackWhenDone) {
//     var jsonResult;
//
//     request(importIOurl, function(error, response, body) {
//         jsonResult = JSON.parse(response.body);
//         preparedFaults = prepareFaults(jsonResult.results);
//         addToMongo(preparedFaults, function() {
//             callbackWhenDone();
//         });
//     });
// }
//
//
// var FS = require('fs'),
//     Q = require('q'),
//     request = require('request');
//
// function getResults(pathToFile) {
//     return Q.nfcall(FS.readFile, pathToFile, "utf-8")
//         .then(function(repo) {
//             var options = {
//                 headers: {
//                     'User-Agent': 'MyAgent'
//                 }
//             }; // github requires user agent string
//             return [Q.nfcall(request, 'https://api.github.com/repos/' + repo + '/collaborators', options),
//                 Q.nfcall(request, 'https://api.github.com/repos/' + repo + '/commits', options)
//             ];
//         })
//         .spread(function(collaboratorsRes, commitsRes) {
//             return [collaboratorsRes[1], commitsRes[1]]; // return the response body
//         })
//         .fail(function(err) {
//             console.error(err)
//             return err;
//         });
// }
//
// // actual call
// getResults('repos.txt').then(function(responses) {
//     // do something with the responses
// });
// mongo.count({}, function(err, result){
//     console.log(result);
// });

// q.ninvoke(mongoose, 'connect', importIOurl)
// .then(function(){
//     console.log('Connectat!');
// })
// .fail(function(){
//     console.log(err);
// });

// function writeHello(callback) {
//     console.log('Hello');
//     err = null;
//     response = 'Response: Wrote hello';
//     callback(err, response);
// }
//
// function writeResponseFromHello(err, response, callback) {
//     response += ' .. and hipphipp';
//     console.log(response);
//     callback(err, response);
// }
//
// q.nfcall(writeHello)
//     .then(writeResponseFromHello)
//     .then(
//         function() {
//             console.log('THEN!');
//             console.log(response);
//         });

//
// run();
//
// function run()  {
//     async.series(
//         [
//             function(next){
//                 winston.log('info','Connecting to mongo..');
//                 mongoose.connect(mongoConnectUrl, function(err){
//                     if(!err){
//                         winston.log('info', 'Connected to mongoDB!');
//                     }else {
//                         winston.log('error', 'Connection to mongoDB failed with the following error: ', err.toString());
//                     }
//                     next();
//                 });
//             },
//             function(next) {
//                 dropReportsCollectionInMongoDB(next);
//             },
//             function(next) {
//                 getJsonAddToMongo(next);
//             },
//             function(done) {
//                 winston.log('info', 'Disconnecting from Mongo..');
//                 mongoose.connection.close(function() {
//                     winston.log('info', 'Mongo disconnected!');
//                 });
//                 done();
//             }
//         ]
//     );
// }
//
// // function connectToMongo(callbackWhenDone) {
// //     try {
// //         mongoose.connect(mongoConnectUrl, function() {
// //             winston.log('info', 'Connected to mongoDB');
// //             callbackWhenDone();
// //         });
// //     } catch (e) {
// //         winston.log('error', 'Error when trying to connect to mongoDB', e.toString());
// //     }
// // }
//
// function dropReportsCollectionInMongoDB(callbackWhenDone) {
//     mongo.remove({}, function(err) {
//         if (!err) {
//             winston.log('info', 'Removed existing content of skaneleden_report from mongodb');
//         } else {
//             winston.log('error', 'Failed to remove existing content of skaneleden_report from mongodb');
//         }
//
//         callbackWhenDone();
//     });
// }
//
// function getJsonAddToMongo(callbackWhenDone) {
//     var jsonResult;
//
//     request(importIOurl, function(error, response, body) {
//         if (!error) {
//             try {
//                 jsonResult = JSON.parse(response.body);
//                 preparedFaults = prepareFaults(jsonResult.results);
//                 addToMongo(preparedFaults, function() {
//                     callbackWhenDone();
//                 });
//             } catch (e) {
//                 winston.log('error', 'Error when parsing json form import.io: ', e.toString());
//             }
//         } else  {
//             winston.log('error', 'Error received when requesting importIOurl: ', error.toString());
//         }
//     });
// }
//
// function prepareFaults(json) {
//     var preparedFaults =   [];
//
//     for (var i = 0; i < json.length; i++) {
//         preparedFault = renameKeysAddSectionId(json[i]);
//         preparedFaults.push(preparedFault);
//     }
//
//     return preparedFaults;
// }
//
// function renameKeysAddSectionId(fault) {
//     preparedFault = {};
//
//     preparedFault.report = fault.avvikelse;
//     preparedFault.trail = fault.del_led;
//     preparedFault.section = fault.etapp;
//     preparedFault.sectionId = 'SL' + sectionMap[fault.del_led] + 'E' + fault.etapp;
//
//     return preparedFault;
// }
//
// function addToMongo(preparedFaults, callbackWhenDone) {
//     // try {
//     async.each(preparedFaults, function(fault, faultDone)  {
//         var newSection = new mongo(fault);
//         newSection.save(function(err) {
//             if (!err) {
//                 winston.log('info', 'Added fault for ', fault.sectionId);
//             } else {
//                 winston.log('error', 'Error when trying to save fault for ', fault.sectionId, ' to mongo');
//             }
//             faultDone();
//         });
//     }, function(err) {
//         if (!err) {
//             winston.log('info', 'All faults added');
//         } else {
//             winston.log('error', 'Error after async has made some magic', JSON.stringify(err));
//         }
//
//         // mongoose.connection.close();
//         callbackWhenDone();
//     });
//
//     // } catch (e) {
//     //     winston.log('error', 'Error when trying add data to mongodb', e.toString());
//     // }
//
// }
//
// //Disconnects mongoDB when application terminates
// process.on('SIGINT', function() {
//     mongoose.connection.close(function() {
//         winston.log('info', 'Disconnected MongoDB after node unexpectedly was terminated!');
//         process.exit(0);
//     });
// });