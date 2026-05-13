# Sana — Yeh Project Kaise Chalana Hai (Hindi/Urdu Guide)

> Yeh file sirf tumhare reference ke liye hai. GitHub pe upload karte time isko **delete kar dena** (ya rakh dena, koi farak nahi padta).

---

## Pehle Yeh Install Hona Chahiye (Tumne Ye Sab Karliya Hai)
- ✅ Node.js
- ✅ VS Code
- ✅ Git
- ✅ Ollama (jab install ho jaye)

---

## Step 1 — Folder Ko VS Code Mein Kholo

1. Yeh `supervisor-analyzer` folder Desktop pe rakho
2. VS Code kholo → **File** → **Open Folder** → yeh folder select karo

---

## Step 2 — Terminal Mein Yeh Commands Chalao (Ek Ek Karke)

VS Code mein terminal kholo (`Ctrl + ~`) aur yeh likho:

```bash
npm install
```
Yeh saari libraries install karega. 1-2 minute lagega.

Phir Ollama wala model download karo:
```bash
ollama pull llama3.2
```
Yeh **5-10 minute** lagega (file 2GB ki hai). Internet chalna chahiye.

---

## Step 3 — App Chalao

Terminal mein:
```bash
npm start
```

Tumhe yeh dikhna chahiye:
```
Trinethra Supervisor Feedback Analyzer
Server: http://localhost:3000
```

---

## Step 4 — Browser Mein Kholo

Browser mein yeh URL daalo:
```
http://localhost:3000
```

Tumhara app khul jayega! 🎉

---

## Step 5 — App Test Karo

1. **"Load sample transcript"** button dabao (right top mein hai)
2. Phir **"Run Analysis"** button dabao
3. 30-60 second wait karo
4. Result aa jayega — Score, Evidence, Gaps, Questions sab dikhega

---

## Agar Koi Error Aaye

| Error | Solution |
|-------|----------|
| `ollama not running` | Terminal mein `ollama serve` chalao |
| `port 3000 already in use` | VS Code band karo, dobara kholo, phir `npm start` |
| `model not found` | `ollama pull llama3.2` chalao |

---

## Video 1 — App Demo (2-3 minute)

**Windows + G** dabao → Recording shuru karo → yeh sab dikhao:
1. Terminal mein `npm start` chalao
2. Browser mein `http://localhost:3000` kholo
3. "Load sample transcript" dabao
4. "Run Analysis" dabao
5. Wait karo result ke liye
6. Score, Evidence, KPIs, Gaps, Questions — sab dikhao
7. Ek evidence quote pe click karo — left side textarea mein highlight hoga (yeh dikhaao)

**Bolna kya hai (script):**
> "Hi, main Sana hoon. Yeh hai Trinethra — Supervisor Feedback Analyzer. Main paste karti hoon ek supervisor transcript… [paste]… ab Run Analysis click karti hoon. Yeh local Ollama LLM use kar raha hai, no cloud, no API key. [wait]… Yeh raha output — Fellow ka score 6/10 hai, label hai 'Reliable and Productive'. Yahan evidence hai — agar main yeh quote click karu, yeh transcript mein highlight ho jata hai. Yahan KPI mapping hai, yahan gaps hain jo supervisor ne miss kiye, aur yahan follow-up questions hain next call ke liye."

---

## Video 2 — Code Walkthrough (3-5 minute)

**Windows + G** dabao → VS Code mein code dikhate hue record karo.

**Yeh bolna hai:**

1. **server.js kholo** —
   > "Yeh backend hai. Express server hai jo browser se request leta hai, prompt banata hai with rubric embedded, aur Ollama ko bhejta hai localhost:11434 pe."

2. **buildPrompt function dikhao** —
   > "Yahan prompt hai — maine rubric ko aur 5 assessment dimensions ko embed kiya hai prompt mein, taaki model ko poora context mile. Maine `format: 'json'` use kiya hai Ollama mein, isse JSON output force hota hai."

3. **extractJson function dikhao** —
   > "LLM ka output kabhi kabhi messy hota hai. Yeh function 3 layers se try karta hai — direct parse, fenced block, regex fallback. Aur agar fail ho jaye toh ek retry hota hai."

4. **public/script.js > highlightInTranscript dikhao** —
   > "Yeh hai Evidence Linking — jab user evidence click karta hai, yeh transcript textarea mein woh text select karta hai aur pulse karta hai. Isse intern ko pata chalta hai quote kahan se aaya."

5. **Confidence card dikhao** —
   > "Maine confidence ko alag se highlight kiya hai — taaki intern automation bias mein na fas jaye. AI suggest karta hai, intern decide karta hai."

6. **Hardest part:**
   > "Sabse mushkil tha LLM se consistent JSON nikalwana. Solution tha — Ollama JSON mode + strict schema in prompt + tolerant parser + one retry."

7. **More time hota toh:**
   > "Inline transcript highlighting karta, aur editable findings — abhi output read-only hai."

---

## Step 6 — GitHub Pe Upload Karo

Terminal mein yeh chalao:

```bash
git init
git add .
git commit -m "Initial: project structure"
```

Phir GitHub.com pe new repo banao (naam: `supervisor-feedback-analyzer`), public rakho.

Phir:
```bash
git remote add origin https://github.com/TUMHARA-USERNAME/supervisor-feedback-analyzer.git
git branch -M main
git push -u origin main
```

> ⚠️ **Important — Commit History:** Assignment mein likha hai "one giant commit = instant rejection". Toh upload karne se pehle thoda kaam alag-alag commits mein break karo. Easy way:
>
> ```bash
> git init
> git add server.js package.json rubric.json
> git commit -m "feat: backend server with Ollama integration"
> git add public/index.html
> git commit -m "feat: frontend UI structure"
> git add public/styles.css
> git commit -m "style: burnt sienna theme + serif typography"
> git add public/script.js
> git commit -m "feat: evidence linking + confidence indicator"
> git add sample-transcripts.json context.md
> git commit -m "docs: domain context + sample transcripts"
> git add README.md .gitignore
> git commit -m "docs: README with setup + design decisions"
> ```

---

## Step 7 — Submit

Internshala chat pe yeh teen cheezein bhejo:
1. GitHub link (Part A)
2. App demo video (Part B - video 1)
3. Code walkthrough video (Part B - video 2)
4. Hand-drawn sketch ki photo (Part B - sketch)
5. Hand-drawn mindmap ki photo (Part C)

---

## Hand-Drawn Sketch (Part B) — Kya Banana Hai

A4 paper pe pen/pencil se yeh banao:
- Box 1: "Problem" — supervisor transcript ko 45 min lagte hain analyze karne mein
- Arrow → Box 2: "My Approach" — Ollama + Express + simple UI
- Box 3: "How I Controlled AI Hallucination" — JSON mode, strict schema, retry, tolerant parser
- Box 4: "Where I Disagreed with AI" — AI ne pehle multi-prompt suggest kiya tha, lekin maine single prompt chuna for speed
- Box 5: "Negative Prompting" — "Return ONLY JSON, no commentary, no markdown fences"
- Box 6: "Aligned with Guidelines" — kept it local (no cloud), beginner-friendly stack

Bilkul professional nahi, simple boxes aur arrows. AI use nahi karna ismein!

---

## Sab Set Hai!

Koi problem ho toh batao. All the best! 💪
