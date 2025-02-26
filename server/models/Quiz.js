const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    title: { type: String, required: true },
    openDate: { type: Date, required: true },
    closeDate: { type: Date, required: true },
    questions: [{
        text: { type: String, required: true },
        image: String,
        type: { type: String, enum: ['radio', 'checkbox'], required: true },
        options: [{ type: String, required: true }],
        correctAnswer: [String] // Array for multiple-choice, string for single-choice
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);