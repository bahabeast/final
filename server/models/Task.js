const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    deadline: { type: Date, required: true },
    requirements: String,
    requirementsFile: String,
    teacherNotes: String,
    week: { type: Number, required: true },
    submissions: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        file: String,
        status: { type: String, enum: ['submitted', 'not-submitted', 'overdue'], default: 'not-submitted' },
        grade: Number,
        submittedAt: Date
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);