const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    weeks: [{
        week: String,
        tasks: String,
        exams: String,
        syllabus: String,
        lectures: String,
        requirements: String
    }]
});

module.exports = mongoose.model('Subject', subjectSchema);