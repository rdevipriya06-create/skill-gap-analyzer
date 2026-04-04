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
        "JS Crash Course - YouTube"
    ],
    "React": [
        "React Tutorial - freeCodeCamp",
        "React Full Course - YouTube"
    ],
    "Node.js": [
        "Node.js Basics - freeCodeCamp"
    ],
    "SQL": [
        "SQL for Beginners - YouTube"
    ],
    "Python": [
        "Python Basics - freeCodeCamp"
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
    const jobSkills = jobRoles[role] || [];
        const roadmapStatic = jobRoadmaps[role] || [];

        const matched = userSkills.filter(skill =>
            jobSkills.includes(skill)
        );

        const missing = jobSkills.filter(skill =>
            !userSkills.includes(skill)
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
                model: "gpt-4.1-mini",
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

/* ---------------- AI CHAT (used by result.html chatbot) ---------------- */
app.post("/ai-chat", async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No message" });

    // Smart keyword replies (work without OpenAI key)
    const replies = {
        "salary":       "💰 Salaries vary by role. Frontend devs earn ₹4–15 LPA (India) / $60K–$120K (US). Data Scientists earn ₹6–25 LPA.",
        "roadmap":      "🗺️ Visit roadmap.sh — free, community-built roadmaps for every tech career!",
        "resume":       "📄 Keep resume to 1 page, use action verbs, quantify results (e.g. 'Improved speed by 40%'), add GitHub links.",
        "interview":    "💼 Practice DSA on LeetCode, system design on YouTube, mock interviews on Pramp.com.",
        "portfolio":    "🎨 Build 3 quality projects, deploy on Netlify/Vercel, host code on GitHub with good READMEs.",
        "learn":        "📚 Best free resources: freeCodeCamp, The Odin Project, CS50 (Harvard), roadmap.sh",
        "job":          "🎯 Apply on LinkedIn, Naukri, AngelList. A strong GitHub profile matters more than your degree!",
        "python":       "🐍 Start with CS50P (Harvard, free) or freeCodeCamp's Python course. Great for AI/data science.",
        "react":        "⚛️ Learn JavaScript first, then React. Use react.dev (official docs) — best resource available.",
        "internship":   "🎓 Apply on Internshala, LinkedIn, AngelList. Even unpaid internships give great early experience.",
    };

    const msgLower = message.toLowerCase();
    for (const key of Object.keys(replies)) {
        if (msgLower.includes(key)) return res.json({ reply: replies[key] });
    }

    // Try OpenAI if key is real
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
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
app.get("/roadmap/:job", (req, res) => {
    const job = req.params.job.toLowerCase();
    res.json(jobRoadmaps[job] || []);
});

/* ---------------- COURSES ---------------- */
app.get("/courses/:skill", (req, res) => {
  const skill = req.params.skill;
    res.json(courseData[skill] || []);
});

/* ---------------- SERVER ---------------- */
app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});