const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');

router.get('/', async (req, res) => {
    try {
        const grades = await Grade.find().populate('userId');
        res.json(grades);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching grades' });
    }
});

router.get('/teacher/:subject', async (req, res) => {
    try {
        const grades = await Grade.find({ subject: req.params.subject });
        const aggregated = grades.reduce((acc, grade) => {
            acc[grade.subject] = { average: grades.length ? (grades.reduce((sum, g) => sum + g.finalGrade, 0) / grades.length).toFixed(1) : 0, students: grades.length };
            return acc;
        }, {});
        res.json(aggregated);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching teacher grades' });
    }
});

module.exports = router;