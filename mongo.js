var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var report = new Schema({
    sectionId: {
        type: String
    },
    report: {
        type: String
    },
    trail: {
        type: String
    },
    section: {
        type: String
    },

});
var report = mongoose.model('skaneleden_report', sectionSchema);

module.exports = {
    Report: report
};