const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');

router.get('/:subject', async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ subject: req.params.subject });
        res.json(quiz || { questions: [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching quiz' });
    }
});

router.post('/:subject/submit', async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ subject: req.params.subject });
        let score = 0;
        quiz.questions.forEach((question, index) => {
            const userAnswer = req.body.answers[`q${index + 1}`];
            if (Array.isArray(question.correctAnswer)) {
                if (JSON.stringify(userAnswer?.sort()) === JSON.stringify(question.correctAnswer.sort())) score++;
            } else if (userAnswer === question.correctAnswer) score++;
        });
        res.json({ success: true, score });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting quiz' });
    }
});

module.exports = router;