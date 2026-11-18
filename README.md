# 🚀 Buildathon: Make Wednesdays Great Again

**Masters' Union · For AI Developers · Winner gets Rs. 25,000**

> **Every team must build in a fork of this repository.** Projects not built in a fork of this repo won't be judged.

| | |
|---|---|
| **Date** | Wednesday, 18 November 2026 |
| **Hacking** | **3:00 PM – 7:00 PM IST** (code freeze at 7:00 PM sharp) |
| **Venue** | CDS Audi, 8th floor |
| **Prize** | Rs. 25,000 to the winning team |
| **Register your fork** | 👉 **[https://forms.gle/ZJUYKwTYjsMsVB2b9](https://forms.gle/ZJUYKwTYjsMsVB2b9)** (**deadline 3:30 PM IST**) |
| **Final submission** | Your fork as it stands at **7:00 PM IST**. There's nothing else to submit. |

> 🤖 **Using an AI coding agent?** Point it at [`AGENTS.md`](AGENTS.md). It has the full event brief, tracks, judging and rules in a form agents can read directly. Claude Code loads it automatically through `CLAUDE.md`, and Codex reads `AGENTS.md` natively.

---

## 🎯 Pick one build track

| # | Track | Brief |
|---|---|---|
| **01** | **Build for the Physical World** | Make a real-world task easier, faster or more reliable. Show it in a realistic scenario. |
| **02** | **Build for AI Agents** | Find something an agent struggles with. Build the tool that fixes it, then demo the agent using it. |
| **03** | **Build in Your Area of Expertise** | Pick a field you know firsthand. Ship a working product that improves how people handle it today. |

## ⚖️ How you'll be judged (each criterion is ⅓ of your score)

| Criterion | The question judges ask |
|---|---|
| **Working product** | Does it do what you say it does? Show the core workflow in your demo. |
| **Problem insight** | Who faces this problem, and why does it happen? |
| **Depth of execution** | How well did you solve the hardest part of the build? |

---

## Why fork this repo?

Everyone starts from the same commit (the **genesis commit**) at the same time. Organizers can then check that:
- all code was written **during** the Buildathon and not brought in from an earlier project,
- teams commit steadily instead of pasting in one huge AI-generated dump at the end,
- every repo stays public and visible while you build.

The organizers track every fork automatically: commits, timing and activity. Read [RULES.md](RULES.md) before you write any code.

---

## ✅ Setup (about 5 minutes, do it at 3:00 PM)

**In short:** fork → register your fork in the form **by 3:30 PM** → build → push before 7:00 PM.

### 1. Fork this repo
Click **Fork** (top right). On the fork screen:
- **Owner:** one team member's personal account. Only **one fork per team**.
- **Repository name:** `buildathon-<team-name>`, for example `buildathon-byte-bandits`
- Click **Create fork**.

> ⚠️ Don't download a ZIP or copy the files into a new repo. **It has to be a real GitHub fork**, or the tracker can't see you.

### 2. Keep it public
Forks of a public repo are public. **Don't make it private, archive it, or delete it** until judging is over.

### 3. Add your teammates
In your fork: **Settings → Collaborators → Add people**. Add each teammate's GitHub account so their commits count toward the team.

### 4. Enable Actions
Open the **Actions** tab of your fork and click **"I understand my workflows, go ahead and enable them"**. This runs the automatic check on every push.

### 5. Make your registration commit (your first commit)
Fill in [`team.json`](team.json). `track` must be one of `physical-world`, `ai-agents` or `area-of-expertise`. Then:

```bash
git clone https://github.com/<your-username>/buildathon-<team-name>.git
cd buildathon-<team-name>
# edit team.json
git add team.json
git commit -m "register: <team name>"
git push
```

The **Hackathon check** in the Actions tab should go green ✅. If it's red, open the run to see what's wrong in `team.json`.

### 6. Register your fork (deadline: 3:30 PM IST)
👉 **[https://forms.gle/ZJUYKwTYjsMsVB2b9](https://forms.gle/ZJUYKwTYjsMsVB2b9)**

It's a 4-question Google Form: team name, fork link, track, team members. It connects your repo to the organizers' live tracker.

- Fill it in **once per team**, right after forking, and **no later than 3:30 PM IST**. **Teams that don't register can't be tracked.**
- Paste your **fork's** URL (`https://github.com/<you>/buildathon-<team-name>`), not this starter repo's.
- Need to change something? Use the **"Edit your response"** link on the confirmation page. Don't fill it in twice.
- **Final submission is automatic.** Whatever is pushed to your fork at 7:00 PM IST is what gets judged.

---

## 🛠 While you build (3:00 – 7:00 PM)

- Put your code anywhere in the repo (`app/`, `src/`, `frontend/`, `backend/`…). There's no required layout.
- **Commit early, commit often**, at least every 30 minutes of real work, with messages that say what changed.
- **Push regularly.** Commits you never push don't exist to the tracker.
- AI coding tools (Claude Code, Codex, Cursor, Copilot…) are **allowed and encouraged**. Keep `AGENTS.md` and `CLAUDE.md` in the repo; they keep your agent within the rules.
- Before 7:00 PM, replace the "Your project" section below with your project's README.

## 🧊 Code freeze: 7:00 PM IST

At 7:00 PM the tracker takes a snapshot of every fork. **Commits pushed after code freeze are ignored.** Judges look at your last commit before 7:00 PM.

## ❌ Things that get you flagged

- Rewriting history (`git push --force`, rebasing away the genesis commit, squashing everything into one commit)
- Commits dated before 3:00 PM
- One or two giant commits containing most of the project
- A repo that isn't a fork of this one, or that's private or deleted

See [RULES.md](RULES.md) for the full list.

---

## Your project

# ✦ Onlocation: cinematic video in real environments

> Drop a pin anywhere on Earth → real Street View + live weather → a directed, narrated short film of you **on location**.

- **Team:** Onlocation (Yashika Dabas, [@yashikadabas](https://github.com/yashikadabas))
- **Track:** `physical-world` (Build for the Physical World)

### Problem
**Who:** creators who want a "me in Kyoto in the rain" clip for Reels/Shorts, travellers previewing a specific street before a trip, and agencies that need a location mood-film for a pitch without flying a crew out.

**Why it happens:** generative image and video tools have never *seen* the street you mean, and they don't know what it's like there *right now*. So they produce a postcard cliché: generic "Paris", always sunny, wrong architecture. The person's face also drifts between shots. Getting the real thing means being physically there with a camera, at the right time, plus editing skills.

### What we built
A single-page web app with one end-to-end workflow:

1. **Cast:** upload 1–5 photos of one person (downscaled in the browser, never stored by us).
2. **Scout:** spin a 3D satellite globe (MapLibre + Esri), search, or 🎲. We reverse-geocode the pin, check Street View, and pull **live weather + local time** (Open-Meteo). With a Maps browser key you walk around an interactive Street View. **The exact panorama position and heading you face is what we shoot.**
3. **Direct:** optional weather override (rain / snow / golden hour / night), scene idea, and era restyle.
4. **Photos:** three location-grounded photos of you at that spot, then a *Wish you were here* postcard composed on canvas.
5. **Film:** a 4-shot film (drone → tracking → place-specific cutaway → hero finale), animated, narrated in first person about the real weather, scored with a mood-matched bed, crossfaded, colour-graded with grain, and exported as **16:9 and 9:16**. *Remix narration* re-voices and re-cuts it without regenerating the visuals.

### The hardest part, and how we solved it
**Making AI output match *this* street at *this* moment, and making the pipeline always deliver.**

- **Grounding from the user's viewpoint.** We fetch 3 Street View frames centred on the heading the user is looking at (`h, h±60°`). GPT-4o vision turns them into a 60–90-word environment description (materials, palette, street furniture, landmarks) that is injected into *every* image prompt.
- **One source of truth for conditions.** `resolveConditions()` merges live weather, local-time light (golden hour, blue hour…) and user overrides into prompt fragments. The photos, the film stills, the narration *and* the title card all use the same resolved conditions, so they never disagree.
- **Identity across shots.** Every still is generated from *all* reference photos plus the user's chosen photo (for outfit continuity) by a multi-reference model, followed by CodeFormer face restoration.
- **A director with rules.** The shot planner's JSON is validated and *repaired* (drone first, hero last, exactly one cutaway, max 4). It retries once and then falls back to a house template.
- **Never return nothing.** If a video clip fails, that shot becomes a Ken Burns move over its still instead of being dropped. If the narration fails, you get a music-only cut. If ffmpeg fails, you get the raw clips as a playlist. With no API keys the app runs in **demo mode** (real geocoding, weather, planning and an ffmpeg edit with stand-in frames), so the demo path never breaks.
- **Real post-production.** Our own ffmpeg filtergraph: normalises every source to 24 fps, chains `xfade` crossfades, applies a teal/orange `curves` grade with vignette and temporal grain, loops and ducks the music under the narration with fades, and renders both aspect ratios.
- Background work runs in Next.js `after()` so it survives serverless response completion. Status payloads never echo selfies back, inputs are validated server-side, and API keys stay on the server behind key-hiding and allow-listed proxies.

### How to run it
```bash
cd web
cp .env.example .env.local   # add keys, or leave blank for demo mode
npm install
npm run dev                  # http://localhost:3000
```
| Key | Used for | Without it |
|---|---|---|
| `GEMINI_API_KEY` **or** `OPENAI_API_KEY` | grounding (vision), shot planning, narration, photo prompts. Gemini has a free tier; the newest flash model is auto-selected. | template shots + narration |
| `GOOGLE_MAPS_API_KEY` | geocoding, Street View frames | OSM geocoding, no grounding frames |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | interactive Street View | static frames |
| `FAL_KEY` | Nano Banana Pro stills, Kling video, CodeFormer, storage | **demo mode** |
| `ELEVENLABS_API_KEY` | narration voice | music-only cut |

ffmpeg ships via `@ffmpeg-installer/ffmpeg`; no system install needed.

**Stack:** Next.js 16 (App Router, Route Handlers, `after()`), React 19, Tailwind v4, Zustand, Framer Motion, MapLibre GL, Google Maps JS, OpenAI, fal.ai, ElevenLabs, sharp, ffmpeg.

### Status at code freeze
- ✅ **Live and verified:** Google Geocoding + Street View (static frames + interactive panorama at the user's heading), Open-Meteo live weather, **Gemini** vision grounding, AI shot planning and first-person narration, weather overrides flowing into every step, ffmpeg film in 16:9 + 9:16, postcard, remix. 41 unit tests pass and the production build is clean.
- 🟡 **Demo mode for the person-in-scene renders:** without a `FAL_KEY`, photos and stills are composited by us (the real Street View frame at your heading + your reference photo, labelled DEMO) and animated with Ken Burns camera moves. Adding `FAL_KEY` switches on Nano Banana Pro stills, Kling clips and CodeFormer with no code changes.
- 💸 **Runs free:** Gemini free tier + Google Maps free tier (or trial credit) + optional ElevenLabs free tier.

### Demo / screenshots
Demo script: landing → *Start creating* → upload photos → 🎲 (or search "Alfama, Lisbon") → look around in Street View → toggle 🌧️ Rain → *Shoot here* → pick a take → *Postcard* → *Make the cinematic film* → watch the production log → play → switch to Vertical → *Remix narration*.
