# Olórin — Union Intelligence Grid

*Chicago Sector // Technocratic Front Lines*

A real-time collaborative map for tracking intelligence, locations, people, events, and assets across the Chicago metro area. Styled as an in-universe Union terminal.

---

## What's Inside

```
olorin/
├── server.js          # Node.js + Express + SQLite-ish (JSON file)
├── package.json       # Dependencies: express, bcryptjs
├── public/
│   └── index.html     # The entire UI — map, login, pins, modals
├── db.json            # Auto-created: your intel database
└── README.md          # This file
```

**No build step.** No React. No TypeScript. Just `npm install && npm start`.

---

## Local Development

```bash
cd olorin
npm install
npm start
# Open http://localhost:3000
# Password: TIsfL2000
```

---

## Deploy to Render (Free Tier)

You said you already set up Render and linked a Git repo. Here's the final step:

### 1. Set the Environment Variable

In your Render dashboard:
- Go to your Web Service → **Environment** tab
- Add:
  - Key: `OLORIN_PASSWORD`
  - Value: `TIsfL2000`
- Click **Save Changes**

Render will auto-redeploy. That's it.

### 2. (Optional) Custom Domain

Render gives you a free `*.onrender.com` URL. Share that in Discord. If you want a custom domain later, it's one click in the Render dashboard.

---

## How to Use

**Login:**
- Enter `TIsfL2000` → ACCESS GRID

**Add Intel:**
- Tap anywhere on the map → "File Report" modal opens
- Pick a type (Location, Person, Event, Organization, Item, Safehouse)
- Name it, add notes, submit
- Everyone sees it instantly (real-time SSE sync)

**View Intel:**
- Tap any pin on the map → bottom sheet slides up with details
- Use filter chips at top to show/hide types

**Delete Intel:**
- Open a pin → tap PURGE → confirm

**Mobile:**
- Works on phones, tablets, laptops
- Optimized for touch: big tap targets, bottom sheets, swipe-friendly

---

## Seed Data (Pre-Loaded)

Two pins are already on the map:

1. **Polsky Center — Field Office** (Safehouse)
   - Hyde Park, UChicago area
   - Your operative home base

2. **Cloud Gate — Control Uplink** (Location)
   - Millennium Park, The Bean
   - Teleportation nexus to Central Control

---

## Password Change

To change the shared password:

1. Set a new `OLORIN_PASSWORD` env var in Render dashboard
2. Re-deploy
3. Tell the table the new password

The old password stops working immediately.

---

## Backup

Your data lives in `db.json` (on Render's disk). To back up:

```bash
# From Render Shell (in dashboard):
cat db.json
# Copy/paste the JSON somewhere safe
```

Or just `curl https://your-app.onrender.com/api/pins` to export everything.

---

## Roadmap

- [x] Phase 1: Drop pins, filter, real-time sync, mobile UI
- [ ] Phase 2: Pin linking, search, edit, timeline
- [ ] Phase 3: Territory polygons, heatmaps, off-map links

---

*Property of the Technocratic Union. Unauthorized access is unmutual.*
