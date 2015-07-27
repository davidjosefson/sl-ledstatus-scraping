var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var reportSchema = new Schema({
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
var report = mongoose.model('skaneleden_report', reportSchema);

module.exports = report;