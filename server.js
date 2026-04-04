const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

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

/* ---------------- AUTH (MOCK) ---------------- */
app.post("/auth/signup", (req, res) => {
    const { name, email, password } = req.body;
    res.json({ token: "mock-token-123", name: name, email: email });
});

app.post("/auth/login", (req, res) => {
    const { email, password } = req.body;
    res.json({ token: "mock-token-123", name: "Student", email: email });
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