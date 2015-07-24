var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var sectionSchema = new Schema({
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
var Section = mongoose.model('skaneleden_report', sectionSchema);

module.exports = {
    Section: Section
};
