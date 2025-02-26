const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');

router.get('/subjects/:subject/tasks', async (req, res) => {
    try {
        const task = await Task.findOne({ subject: req.params.subject, week: parseInt(req.query.week) || 1 });
        res.json(task || {});
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching task' });
    }
});

router.post('/subjects/:subject/tasks/submit', async (req, res) => {
    try {
        const task = await Task.findOne({ subject: req.params.subject, week: parseInt(req.query.week) || 1 });
        const userId = req.user?.id; // Assume you have middleware for authentication
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const submission = {
            userId,
            file: req.body.file || null,
            status: 'submitted',
            submittedAt: new Date()
        };
        task.submissions.push(submission);
        await task.save();
        res.json({ success: true, message: 'Task submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting task' });
    }
});

router.get('/teacher/:subject/student-tasks', async (req, res) => {
    try {
        const tasks = await Task.find({ subject: req.params.subject })
            .populate('submissions.userId');
        const filteredTasks = tasks.filter(task => {
            const group = req.query.group;
            const student = req.query.student;
            const week = parseInt(req.query.week) || 1;
            return task.week === week && task.submissions.some(s => {
                if (student && s.userId?.name !== student) return false;
                if (group) return s.userId?.organizationCode === group;
                return true;
            });
        });
        res.json(filteredTasks.map(task => ({
            id: task._id,
            title: task.title,
            status: task.submissions[0]?.status || 'not-submitted',
            grade: task.submissions[0]?.grade,
            description: task.description,
            file: task.submissions[0]?.file
        })));
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching student tasks' });
    }
});

router.get('/teacher/:subject/students', async (req, res) => {
    try {
        const students = await User.find({ role: 'student', organizationCode: req.query.group });
        res.json(students.map(student => `${student.firstName} ${student.surname}`));
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching students' });
    }
});

module.exports = router;