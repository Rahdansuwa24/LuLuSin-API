var express = require('express');
var path = require('path');
var logger = require('morgan');
var dotenv = require('dotenv');
const session = require('express-session');
const cors = require('cors');
dotenv.config();

const port = process.env.PORT || 3002;

const { db, connectDB } = require('./config/database/connection');

var { teacher, admin, subjectcategory, tryout, tryoutScore, studentsanswer, student, tryoutsubjectscore, answeroption, question, subject, questionsExplanation } = require('./config/database/table/controler');

var app = express();

var indexRouter = require('./routes/index');

// Folder auth
var authRegisterRouter = require('./routes/auth/register');
var authLoginRouter = require('./routes/auth/login');
var authLogOutRouter = require('./routes/auth/logout');

// Folder admin
var adminDashboard = require('./routes/admin/dashboard');
var adminStudentRouter = require('./routes/admin/student');
var adminteacherRouter = require('./routes/admin/teacher');

// Folder student
var studentDashboardRouter = require('./routes/students/dashboard');
var studentTryoutRouter = require('./routes/students/tryout');

// Folder teacher
var teacherDashboardRouter = require('./routes/teachers/dashboard');
var teacherCategorySubjectRouter = require('./routes/teachers/subjectCategory');
var teacherSubjectRouter = require('./routes/teachers/subject');
var teachertryoutRouter = require('./routes/teachers/tryout');

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'LuLusin',
        resave: false,
        saveUninitialized: true,
        cookie: { 
            secure: false,
            httpOnly: true,
        },
    })
);

// CORS dinamis untuk development lokal dan Cloudflare Pages production
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173';
const allowedOrigins = rawOrigins.split(',').map(url => url.trim()).filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));

app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint untuk Docker Compose & Caddy reverse proxy
app.get('/health', async (req, res) => {
    try {
        await db.authenticate();
        return res.status(200).json({
            status: 'healthy',
            service: 'backend-lulusin',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (err) {
        return res.status(503).json({
            status: 'degraded',
            service: 'backend-lulusin',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            database: 'error',
            error: err.message
        });
    }
});

app.use('/API', indexRouter);

// Folder auth
app.use('/API', authRegisterRouter);
app.use('/API', authLoginRouter);
app.use('/API', authLogOutRouter);

// Folder admin
app.use('/API', adminDashboard);
app.use('/API', adminStudentRouter);
app.use('/API', adminteacherRouter);

// Folder student
app.use('/API', studentDashboardRouter);
app.use('/API', studentTryoutRouter);

// Folder teacher
app.use('/API', teacherDashboardRouter);
app.use('/API', teacherCategorySubjectRouter);
app.use('/API', teacherSubjectRouter);
app.use('/API', teachertryoutRouter);

app.listen(port, () => {
    console.log(`Running at http://localhost:${port}`);
});

async function initialize() {
    await connectDB();
    await db.sync({ alter: false, force: false });
    console.log("Database success sync");
}

initialize()
.catch(error => {
    console.error("Failed to initialize database: ", error);
});

module.exports = app;
