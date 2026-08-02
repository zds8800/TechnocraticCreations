import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ── Config ──────────────────────────────────────────────────────────
const PASSWORD = process.env.OLORIN_PASSWORD || 'TIsfL2000';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);
const DB_FILE = 'db.json';

// ── DB helpers ──────────────────────────────────────────────────────
async function loadDB() {
  if (!existsSync(DB_FILE)) return { pins: [] };
  try {
    return JSON.parse(await readFile(DB_FILE, 'utf8'));
  } catch {
    return { pins: [] };
  }
}

async function saveDB(data) {
  await writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Seed data if empty
let db = await loadDB();
if (!db.pins || db.pins.length === 0) {
  db.pins = [
    {
      id: 'seed-001',
      lat: 41.7915,
      lng: -87.5998,
      type: 'safehouse',
      name: 'Polsky Center — Field Office',
      notes: 'Operative home base. Hyde Park front. Access via University of Chicago Polsky Center for Entrepreneurship. Low-profile, high-speed fiber. Do not discuss Union business in the café.',
      created_at: new Date().toISOString()
    },
    {
      id: 'seed-002',
      lat: 41.8827,
      lng: -87.6233,
      type: 'location',
      name: 'Cloud Gate — Control Uplink',
      notes: 'Public teleportation nexus to Central Control. Approach the Bean at 03:00 local when crowd density is minimal. Stand on the northeast reflection point. Do NOT use during Lollapalooza.',
      created_at: new Date().toISOString()
    }
  ];
  await saveDB(db);
}

// ── SSE clients ─────────────────────────────────────────────────────
const clients = [];

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => {
    try { res.write(payload); } catch { /* client disconnected */ }
  });
}

// ── Routes ──────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (bcrypt.compareSync(password, PASSWORD_HASH)) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: 'ACCESS DENIED — UNMUTUAL' });
  }
});

app.get('/api/pins', async (req, res) => {
  db = await loadDB();
  res.json(db.pins);
});

app.post('/api/pins', async (req, res) => {
  db = await loadDB();
  const pin = {
    id: `pin-${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };
  db.pins.push(pin);
  await saveDB(db);
  broadcast({ type: 'pin-added', pin });
  res.json(pin);
});

app.delete('/api/pins/:id', async (req, res) => {
  db = await loadDB();
  db.pins = db.pins.filter((p) => p.id !== req.params.id);
  await saveDB(db);
  broadcast({ type: 'pin-deleted', id: req.params.id });
  res.json({ ok: true });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    const idx = clients.indexOf(res);
    if (idx !== -1) clients.splice(idx, 1);
  });
});

// ── Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`◉ OLORIN v1.0 — Union Intelligence Grid`);
  console.log(`  Chicago Sector online at http://localhost:${PORT}`);
  console.log(`  Pins loaded: ${db.pins.length}`);
});
