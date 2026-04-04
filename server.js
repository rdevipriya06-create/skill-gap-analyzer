const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const mongoose = require("mongoose");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

// --- PROFESSIONAL SECURITY HEADERS ---
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// --- MONGODB CONNECTION (WORLD LAUNCH) ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/skillsync"; 
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- PERMANENT DATA MODEL ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

// ---------------- AI SETUP ----------------
const openai = new OpenAI({
    apiKey: "sk-proj-xxxxxxxxxxxx" // keep this safe
});

/* ---------------- JOB SKILLS ---------------- */
const jobRoles = {
    "web developer": ["HTML", "CSS", "JavaScript", "React", "Node.js"],
    "data analyst": ["Excel", "SQL", "Python", "Power BI"],
    "android developer": ["Java", "Kotlin", "Android Studio"],
    "full stack developer": ["HTML", "CSS", "JavaScript", "React", "Node.js", "MongoDB"]
};

/* ---------------- ROADMAP ---------------- */
const jobRoadmaps = {
    "web developer": [
        "Learn HTML basics",
        "Learn CSS (Flexbox, Grid)",
        "Learn JavaScript fundamentals",
        "Understand DOM manipulation",
        "Learn React",
        "Learn Node.js & Express",
        "Build full-stack projects"
    ],

    "data analyst": [
        "Learn Excel",
        "Learn SQL",
        "Learn Python basics",
        "Learn Pandas & NumPy",
        "Learn Data Visualization",
        "Work on real datasets"
    ],

    "android developer": [
        "Learn Java/Kotlin",
        "Learn Android Studio",
        "Build UI layouts",
        "Learn API integration",
        "Build apps"
    ],

    "full stack developer": [
        "Learn HTML & CSS",
        "Learn JavaScript",
        "Learn React",
        "Learn Node.js",
        "Learn MongoDB",
        "Build full projects"
    ]
};

/* ---------------- COURSES ---------------- */
const courseData = {
    "JavaScript": [
        "JavaScript Basics - freeCodeCamp",
        "JS Crash Course - YouTube",
        "Modern JavaScript From The Beginning - Udemy"
    ],
    "React": [
        "React Tutorial - freeCodeCamp",
        "React Full Course - YouTube",
        "Complete React Developer - Zero to Mastery"
    ],
    "Node.js": [
        "Node.js Basics - freeCodeCamp",
        "Node.js API Development - YouTube"
    ],
    "SQL": [
        "SQL for Beginners - YouTube",
        "PostgreSQL Bootcamp - Udemy"
    ],
    "Python": [
        "Python Basics - freeCodeCamp",
        "100 Days of Code: Complete Python Bootcamp - Udemy"
    ],
    "HTML": [
        "HTML Crash Course For Absolute Beginners - YouTube",
        "Responsive Web Design - freeCodeCamp"
    ],
    "CSS": [
        "CSS Full Course - YouTube",
        "CSS Grid & Flexbox Masterclass - Udemy"
    ],
    "MongoDB": [
        "MongoDB Crash Course - YouTube",
        "MongoDB Node.js integration - freeCodeCamp"
    ],
    "Excel": [
        "Microsoft Excel - Excel from Beginner to Advanced - Udemy",
        "Excel For Data Analytics - YouTube"
    ],
    "Power BI": [
        "Power BI Full Course - YouTube",
        "Getting Started with Power BI - Microsoft Learn"
    ],
    "Java": [
        "Java Programming for Complete Beginners - Udemy",
        "Java Full Course - freeCodeCamp"
    ],
    "Kotlin": [
        "Kotlin Crash Course - YouTube",
        "Android App Development with Kotlin - Udacity"
    ],
    "Android Studio": [
        "Android Development for Beginners - freeCodeCamp",
        "Build Your First Android App - YouTube"
    ]
};

/* ---------------- PROGRESS ---------------- */
let progressData = {};

/* ---------------- MAIN HYBRID API ---------------- */
app.post("/analyze", async (req, res) => {
    console.log("API HIT");

    try {
        const { userSkills, jobRole } = req.body;

        if (!userSkills || !jobRole) {
            return res.status(400).json({
                error: "Provide userSkills and jobRole"
            });
        }

        const role = jobRole.toLowerCase();

        // ---------- STATIC LOGIC ----------
        let jobSkills = jobRoles[role];
        let roadmapStatic = jobRoadmaps[role];

        // If the job role is not in our specific list, create a smart adaptive fallback
        if (!jobSkills) {
            jobSkills = [...userSkills, "System Design", "Cloud Deployment", "Advanced Debugging", "Security Best Practices"];
            roadmapStatic = [
                `Research daily tasks for a ${jobRole}`,
                "Complete advanced online certifications",
                "Contribute to open source projects",
                "Prepare for technical interviews",
                "Apply for full-time roles"
            ];
        }

        const lowerJobSkills = jobSkills.map(s => s.toLowerCase());
        const lowerUserSkills = userSkills.map(s => s.toLowerCase());

        const matched = userSkills.filter(skill =>
            lowerJobSkills.includes(skill.toLowerCase())
        );

        const missing = jobSkills.filter(skill =>
            !lowerUserSkills.includes(skill.toLowerCase())
        );

        const fitScoreStatic = jobSkills.length
            ? Math.round((matched.length / jobSkills.length) * 100)
            : 0;

        let finalResult = {
            fitScore: fitScoreStatic,
            matchedSkills: matched,
            missingSkills: missing,
            roadmap: roadmapStatic,
            courses: []
        };

        // static courses
        missing.forEach(skill => {
            if (courseData[skill]) {
                finalResult.courses.push({
                    skill,
                    courses: courseData[skill]
                });
            }
        });

        // ---------- AI TRY ----------
        try {
            console.log("Trying AI...");

            const prompt = `
            User wants to become ${jobRole}.
            Current skills: ${userSkills.join(", ")}.

            Return JSON:
{
              fitScore: number,
              missingSkills: [],
              roadmap: [],
              courses: []
            }
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            });

            const aiText = response.choices[0].message.content;

            const jsonMatch = aiText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const aiData = JSON.parse(jsonMatch[0]);

                finalResult.fitScore = aiData.fitScore || finalResult.fitScore;
                finalResult.missingSkills = aiData.missingSkills || finalResult.missingSkills;
                finalResult.roadmap = aiData.roadmap || finalResult.roadmap;
                finalResult.courses = aiData.courses || finalResult.courses;
            }

            console.log("AI SUCCESS");

        } catch (aiError) {
            console.log("AI FAILED → Using static data");
        }

        res.json(finalResult);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Server error"
        });
    }
});

/* ---------------- AUTH (MOCK DB) ---------------- */
const usersDB = []; // Tiny temporary database
app.post("/auth/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already exists! Try logging in." });

        // 2. Create the permanent account
        const newUser = await User.create({ name, email, password });

        console.log(`✨ New User Registered: ${name} (${email})`);
        res.json({ token: "permanent-token-xyz", name: newUser.name, email: newUser.email });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "Could not create account in database." });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔍 Login attempt for: ${email}`);

        // Ensure database is ready!
        if (mongoose.connection.readyState !== 1) {
            console.error("❌ Database not connected yet!");
            return res.status(503).json({ error: "Database starting up... please wait 30 seconds." });
        }
        
        // Find the user in the permanent database
        const user = await User.findOne({ email });
        
        if (user) {
            // For now, simple password check (In real production, we'd use bcrypt)
            if (user.password !== password) return res.status(401).json({ error: "Incorrect password." });
            
            console.log(`✅ Login Success: ${user.name}`);
            res.json({ token: "permanent-token-xyz", name: user.name, email: user.email });
        } else {
            console.log(`❌ User Not Found: ${email}`);
            res.status(404).json({ error: "User not found. Please sign up FIRST to create your new cloud account!" });
        }
    } catch (err) {
        console.error("💀 Login error details:", err.message);
        res.status(500).json({ error: "Server error during login. Make sure you set your MONGODB_URI on Render!" });
    }
});

/* ---------------- ADMIN PANEL (ONLY FOR YOU) ---------------- */
app.get("/admin/users", async (req, res) => {
    const { secret } = req.query;
    const MY_SECRET_KEY = "my-secret-admin-pass";

    if (secret !== MY_SECRET_KEY) {
        return res.status(403).send("<h1>Access Denied ❌</h1><p>You need the secret key to see this dashboard.</p>");
    }

    try {
        // Fetch all users from the actual database
        const allUsers = await User.find().sort({ createdAt: -1 });

        let html = `
        <html>
        <head>
            <title>Admin Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: sans-serif; padding: 20px; background: #f9f9f9; }
                h1 { color: #4B6BFB; }
                .table-container { overflow-x: auto; background: white; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                table { border-collapse: collapse; width: 100%; min-width: 400px; }
                th, td { border: 1px solid #eee; padding: 12px; text-align: left; }
                th { background-color: #4B6BFB; color: white; }
                tr:nth-child(even) { background-color: #f8f9ff; }
                .pass-mask { color: #888; font-family: monospace; }
            </style>
        </head>
        <body>
            <h1>SkillSync AI User Database 🚀 (Live MongoDB)</h1>
            <p>Total Registered Users: <strong>${allUsers.length}</strong></p>
            <div class="table-container">
                <table>
                    <tr><th>#</th><th>Date Joined</th><th>Name</th><th>Email</th><th>Password</th></tr>
                    ${allUsers.map((u, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                            <td>${u.name}</td>
                            <td>${u.email}</td>
                            <td class="pass-mask">••••••••</td>
                        </tr>`).join('')}
                </table>
            </div>
            <p style="margin-top:20px; font-size: 12px; color: gray;">Note: These users are permanently stored in your MongoDB Atlas cloud.</p>
        </body>
        </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send("Error fetching users from database.");
    }
});

/* ---------------- AI CHAT (used by result.html chatbot) ---------------- */
app.post("/ai-chat", async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No message" });

    // Smart keyword replies (work without OpenAI key)
    const replies = {
        "salary": "💰 Salaries vary by role. Frontend devs earn ₹4–15 LPA (India) / $60K–$120K (US). Data Scientists earn ₹6–25 LPA.",
        "roadmap": "🗺️ Visit roadmap.sh — free, community-built roadmaps for every tech career!",
        "resume": "📄 Keep resume to 1 page, use action verbs, quantify results (e.g. 'Improved speed by 40%'), add GitHub links.",
        "interview": "💼 Practice DSA on LeetCode, system design on YouTube, mock interviews on Pramp.com.",
        "portfolio": "🎨 Build 3 quality projects, deploy on Netlify/Vercel, host code on GitHub with good READMEs.",
        "learn": "📚 Best free resources: freeCodeCamp, The Odin Project, CS50 (Harvard), roadmap.sh",
        "job": "🎯 Apply on LinkedIn, Naukri, AngelList. A strong GitHub profile matters more than your degree!",
        "python": "🐍 Start with CS50P (Harvard, free) or freeCodeCamp's Python course. Great for AI/data science.",
        "react": "⚛️ Learn JavaScript first, then React. Use react.dev (official docs) — best resource available.",
        "internship": "🎓 Apply on Internshala, LinkedIn, AngelList. Even unpaid internships give great early experience.",
    };

    const msgLower = message.toLowerCase();
    for (const key of Object.keys(replies)) {
        if (msgLower.includes(key)) return res.json({ reply: replies[key] });
    }

    // Try OpenAI if key is real
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful career advisor for tech students. Give concise, practical advice in 2-3 sentences." },
                { role: "user", content: message }
            ],
            max_tokens: 200
        });
        res.json({ reply: response.choices[0].message.content });
    } catch {
        res.json({ reply: "🤔 Great question! Check roadmap.sh for career paths, freeCodeCamp for free courses, and LinkedIn for networking. Keep building projects! 💪" });
    }
});

/* ---------------- PROGRESS ---------------- */
app.post("/progress", (req, res) => {
    const { skill, progress } = req.body;

    if (!skill || progress === undefined) {
        return res.status(400).json({
            error: "Provide skill and progress"
        });
    }

    progressData[skill] = progress;

    res.json({
        message: "Progress updated",
        progressData
    });
});

app.get("/progress", (req, res) => {
    res.json(progressData);
});

/* ---------------- ROADMAP ---------------- */
app.get("/roadmap/:role", (req, res) => {
    const role = req.params.role.toLowerCase();

    if (!jobRoadmaps[role]) {
        return res.json([
            `Research daily tasks for ${role}`,
            "Complete advanced online certifications",
            "Contribute to open source projects",
            "Prepare for technical interviews",
            "Apply for full-time roles"
        ]);
    }

    res.json(jobRoadmaps[role]);
});

/* ---------------- COURSES ---------------- */
app.get("/courses/:skill", (req, res) => {
    const skill = req.params.skill;

    if (!courseData[skill]) {
        return res.json([
            `Advanced ${skill} Masterclass on Udemy`,
            `${skill} Certification on Coursera`,
            `FreeCodeCamp ${skill} Crash Course`
        ]);
    }

    res.json(courseData[skill]);
});

/* ---------------- SERVER ---------------- */
app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});