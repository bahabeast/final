const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalExt = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, originalExt);
        cb(null, `${baseName}-${uniqueSuffix}${originalExt}`);
    }
});
const upload = multer({ storage });

// MongoDB connection (hardcoded)
mongoose.connect('mongodb://localhost:27017/edu-platform', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(`MongoDB error: ${err}`));

// Schemas
const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['student', 'teacher'], required: true },
    organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }],
    password: { type: String, required: true }
});

const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    createdAt: { type: Date, default: Date.now }
});

const SubjectSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    createdAt: { type: Date, default: Date.now }
});

const SubjectContentSchema = new mongoose.Schema({
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    weeks: [{
        weekNumber: { type: Number, required: true },
        materials: [{
            type: { type: String, enum: ['syllabus', 'lecture', 'notes'], required: true },
            title: { type: String, required: true },
            content: { type: String },
            fileUrl: { type: String }
        }],
        tasks: [{
            organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
            type: { type: String, enum: ['assignment', 'exam', 'task'], required: true },
            title: { type: String, required: true },
            dueDate: { type: Date },
            content: { type: String },
            fileUrl: { type: String }
        }]
    }]
});

const Admin = mongoose.model('Admin', AdminSchema);
const User = mongoose.model('User', UserSchema);
const Organization = mongoose.model('Organization', OrganizationSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const SubjectContent = mongoose.model('SubjectContent', SubjectContentSchema);

// JWT secret (hardcoded)
const JWT_SECRET = 'my-super-secret-key';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Generate a random 6-character code
const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Admin Routes
app.post('/api/admin/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = new Admin({ username, password: hashedPassword });
        await admin.save();
        res.json({ success: true, message: 'Admin registered' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Username taken' });
    }
});

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username });
        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token, username: admin.username });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/admin', authenticateToken, (req, res) => {
    res.json({ admin: { username: req.user.username } });
});

// User Routes
app.get('/api/users', authenticateToken, async (req, res) => {
    const users = await User.find().populate('organizations', 'name');
    res.json(users);
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error removing user' });
    }
});

app.post('/api/signup', async (req, res) => {
    const { name, email, role, code, password } = req.body;
    try {
        let organizations = [];
        if (role === 'student') {
            if (!code) {
                return res.status(400).json({ success: false, message: 'Organization code required for students' });
            }
            const organization = await Organization.findOne({ code });
            if (!organization) {
                return res.status(400).json({ success: false, message: 'Invalid organization code' });
            }
            organizations = [organization._id];
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            role,
            organizations,
            password: hashedPassword
        });
        await user.save();
        res.json({ success: true, message: 'Signup successful' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Email already in use or invalid data' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token, email: user.email, role: user.role, name: user.name });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').populate('organizations', 'name');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, organizations: user.organizations } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Organization Routes
app.post('/api/organizations', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        let code;
        let isUnique = false;
        do {
            code = generateCode();
            isUnique = !(await Organization.findOne({ code }));
        } while (!isUnique);

        const organization = new Organization({
            name,
            code,
            createdBy: req.user.id
        });
        await organization.save();
        res.json({ success: true, code });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Error creating organization' });
    }
});

app.get('/api/organizations', authenticateToken, async (req, res) => {
    const organizations = await Organization.find({ createdBy: req.user.id });
    const orgsWithCounts = await Promise.all(organizations.map(async (org) => {
        const memberCount = await User.countDocuments({ organizations: org._id });
        return { ...org.toObject(), memberCount };
    }));
    res.json(orgsWithCounts);
});

app.post('/api/users/:id/organizations', authenticateToken, async (req, res) => {
    const { organizationName } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'teacher') {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        const organization = await Organization.findOne({ name: organizationName });
        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }
        if (!user.organizations.includes(organization._id)) {
            user.organizations.push(organization._id);
            await user.save();
        }
        res.json({ success: true, message: 'Teacher assigned to organization' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error assigning teacher' });
    }
});

// Subject Routes
app.post('/api/subjects', authenticateToken, async (req, res) => {
    const { name, teacherId } = req.body;
    try {
        const subject = new Subject({
            name,
            teacher: teacherId || null
        });
        await subject.save();
        res.json({ success: true, message: 'Subject added', subject });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Subject name already exists or invalid data' });
    }
});

app.get('/api/subjects', authenticateToken, async (req, res) => {
    const user = await User.findById(req.user.id).populate('organizations');
    let subjects;
    if (req.user.role === 'student' && user.organizations.length > 0) {
        const orgIds = user.organizations.map(org => org._id);
        const teachers = await User.find({ role: 'teacher', organizations: { $in: orgIds } }).select('_id');
        const teacherIds = teachers.map(t => t._id);
        subjects = await Subject.find({ teacher: { $in: teacherIds } }).populate('teacher', 'name');
    } else {
        subjects = await Subject.find().populate('teacher', 'name');
    }
    res.json(subjects);
});

app.delete('/api/subjects/:id', authenticateToken, async (req, res) => {
    try {
        const subject = await Subject.findByIdAndDelete(req.params.id);
        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found' });
        }
        res.json({ success: true, message: 'Subject removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error removing subject' });
    }
});

// ... (previous code unchanged up to Subject Content Routes) ...

// ... (previous code unchanged up to Subject Content Routes) ...

app.get('/api/subject/:subjectId/content', authenticateToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.subjectId)) {
            return res.status(400).json({ success: false, message: 'Invalid subject ID' });
        }
        let content = await SubjectContent.findOne({ subjectId: req.params.subjectId }).populate('subjectId');
        if (!content) {
            content = new SubjectContent({
                subjectId: req.params.subjectId,
                weeks: Array.from({ length: 10 }, (_, i) => ({ weekNumber: i + 1, materials: [], tasks: [] }))
            });
            await content.save();
        }
        if (req.user.role === 'student') {
            const user = await User.findById(req.user.id).populate('organizations');
            const orgIds = user.organizations.map(org => org._id.toString());
            const filteredWeeks = content.weeks.map(week => ({
                ...week.toObject(),
                tasks: week.tasks.filter(task => orgIds.includes(task.organizationId.toString()))
            }));
            res.json({ success: true, weeks: filteredWeeks });
        } else {
            res.json({ success: true, weeks: content.weeks });
        }
    } catch (error) {
        console.error('Error in GET /subject/:subjectId/content:', error);
        res.status(500).json({ success: false, message: 'Error fetching content' });
    }
});

app.post('/api/subject/:subjectId/content', authenticateToken, upload.array('files'), async (req, res) => {
    const { weeksData } = req.body;
    const weeks = JSON.parse(weeksData);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.subjectId)) {
            return res.status(400).json({ success: false, message: 'Invalid subject ID' });
        }
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Only teachers can add content' });
        }
        const subject = await Subject.findById(req.params.subjectId);
        if (!subject || subject.teacher.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized to edit this subject' });
        }
        let content = await SubjectContent.findOne({ subjectId: req.params.subjectId });
        if (!content) {
            content = new SubjectContent({ subjectId: req.params.subjectId, weeks });
        } else {
            content.weeks = weeks.map(week => {
                const existingWeek = content.weeks.find(w => w.weekNumber === week.weekNumber) || { materials: [], tasks: [] };
                return {
                    weekNumber: week.weekNumber,
                    materials: week.materials.map(mat => ({
                        ...mat,
                        fileUrl: req.files.find(f => f.originalname === `${week.weekNumber}_mat_${mat.title}`) ? `/uploads/${req.files.find(f => f.originalname === `${week.weekNumber}_mat_${mat.title}`).filename}` : mat.fileUrl
                    })),
                    tasks: week.tasks.map(task => ({
                        ...task,
                        fileUrl: req.files.find(f => f.originalname === `${week.weekNumber}_task_${task.title}`) ? `/uploads/${req.files.find(f => f.originalname === `${week.weekNumber}_task_${task.title}`).filename}` : task.fileUrl
                    }))
                };
            });
        }
        await content.save();
        res.json({ success: true, message: 'Content saved' });
    } catch (error) {
        console.error('Error in POST /subject/:subjectId/content:', error);
        res.status(500).json({ success: false, message: 'Error saving content' });
    }
});
// ... (rest of server.js unchanged) ...

// ... (rest of server.js unchanged) ...

// Start server (hardcoded port)
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
// Stub endpoints to prevent 404s
app.get('/api/notifications', authenticateToken, (req, res) => {
    res.json([]); // Empty array for now
});

app.get('/api/grades', authenticateToken, (req, res) => {
    res.json([]); // Empty array for now
});

app.get('/api/teacher/grades', authenticateToken, (req, res) => {
    res.json([]); // Empty array for now
});