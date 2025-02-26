const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Quiz = require('../models/Quiz');

router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const tasks = await Task.find({ 'submissions.userId': userId }).select('title deadline');
        const quizzes = await Quiz.find().select('title openDate closeDate');
        const events = [
            ...tasks.map(task => ({
                title: task.title,
                start: task.deadline,
                allDay: true
            })),
            ...quizzes.map(quiz => ({
                title: quiz.title,
                start: quiz.openDate,
                end: quiz.closeDate
            }))
        ];
        res.json(events);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching events' });
    }
});

module.exports = router;