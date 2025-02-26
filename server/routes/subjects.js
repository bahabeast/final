const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');

router.get('/', async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching subjects' });
    }
});

router.get('/:subject/weeks', async (req, res) => {
    try {
        const subject = await Subject.findOne({ name: req.params.subject });
        res.json(subject?.weeks || []);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching weeks' });
    }
});

router.get('/:subject/tasks', async (req, res) => {
    try {
        const subject = await Subject.findOne({ name: req.params.subject });
        const week = parseInt(req.query.week) || 1;
        const tasks = subject?.weeks.find(w => w.week === `Week ${week}`)?.tasks || [];
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching tasks' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, code, weeks } = req.body;
        const subject = new Subject({ name, code, weeks: weeks || [] });
        await subject.save();
        res.json({ success: true, message: 'Subject added' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding subject' });
    }
});
module.exports = router;