const mongoose = require('mongoose');
const User = require('./models/User');
const Subject = require('./models/Subject');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to MongoDB for seeding');

    // Seed a user
    const user = new User({
        firstName: "John",
        surname: "Doe",
        email: "john.doe@example.com",
        organizationCode: "ORG123",
        password: await bcrypt.hash("password123", 10),
        role: "student"
    });
    await user.save();

    // Seed a subject
    const subject = new Subject({
        name: "Mathematics",
        code: "MATH101",
        weeks: [{
            week: "Week 1",
            tasks: "Complete algebra assignment",
            exams: "Midterm on Feb 28, 2025",
            syllabus: "Introduction to Algebra",
            lectures: "Lecture 1: Variables and Equations",
            requirements: "Submit as PDF"
        }]
    });
    await subject.save();

    console.log('Database seeded successfully');
    process.exit();
}).catch(error => console.error('Seeding error:', error));