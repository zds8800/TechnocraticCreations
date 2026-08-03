import express from 'express';
import { MongoClient } from 'mongodb';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ── Config ──────────────────────────────────────────────────────────
const PASSWORD = process.env.OLORIN_PASSWORD || 'TIsfL2000';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);
const MONGODB_URI = process.env.MONGODB_URI;

// ── Database Adapter ────────────────────────────────────────────────
let useMongo = false;
let mongoCollection = null;
let mongoLinksCollection = null;
const FILE_DB = 'db.json';

const SEED_PINS = [
  {
    id: 'seed-001',
    lat: 41.7915, lng: -87.5998, type: 'safehouse',
    name: 'Polsky Center — Field Office',
    notes: 'Operative home base. Hyde Park front. Access via University of Chicago Polsky Center for Entrepreneurship. Low-profile, high-speed fiber. Do not discuss Union business in the café.',
    created_at: new Date().toISOString()
  },
  {
    id: 'seed-002',
    lat: 41.8827, lng: -87.6233, type: 'location',
    name: 'Cloud Gate — Control Uplink',
    notes: 'Public teleportation nexus to Central Control. Approach the Bean at 03:00 local when crowd density is minimal. Stand on the northeast reflection point. Do NOT use during Lollapalooza.',
    created_at: new Date().toISOString()
  }
];

async function initDB() {
  if (MONGODB_URI) {
    try {
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      mongoCollection = client.db('olorin').collection('pins');
      mongoLinksCollection = client.db('olorin').collection('links');

      // Seed pins if empty
      const count = await mongoCollection.countDocuments();
      if (count === 0) {
        await mongoCollection.insertMany(
          SEED_PINS.map(p => ({ _id: p.id, ...p }))
        );
      }
      useMongo = true;
      console.log('✓ MongoDB connected — data will persist across deploys');
      return;
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
      console.log('Falling back to file-based storage');
    }
  }

  console.log('⚠️  Using file-based storage — DATA WILL NOT PERSIST across deploys');
  console.log('   Set MONGODB_URI environment variable for persistent storage');

  if (!existsSync(FILE_DB)) {
    await writeFile(FILE_DB, JSON.stringify({ pins: SEED_PINS, links: [] }, null, 2));
  }
}

// ── Pin helpers ─────────────────────────────────────────────────────
async function loadPins() {
  if (useMongo) {
    const docs = await mongoCollection.find({}).toArray();
    return docs.map(d => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest };
    });
  }
  try {
    const data = JSON.parse(await readFile(FILE_DB, 'utf8'));
    return data.pins || [];
  } catch { return []; }
}

async function savePin(pin) {
  if (useMongo) {
    await mongoCollection.insertOne({ _id: pin.id, ...pin });
  } else {
    const data = JSON.parse(await readFile(FILE_DB, 'utf8'));
    data.pins.push(pin);
    await writeFile(FILE_DB, JSON.stringify(data, null, 2));
  }
}

async function updatePin(id, updates) {
  if (useMongo) {
    await mongoCollection.updateOne(
      { _id: id },
      { $set: { ...updates, updated_at: new Date().toISOString() } }
    );
    const doc = await mongoCollection.findOne({ _id: id });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id, ...rest };
  }
  const data = JSON.parse(await readFile(FILE_DB, 'utf8'));
  const idx = data.pins.findIndex(p => p.id === id);
  if (idx === -1) return null;
  data.pins[idx] = { ...data.pins[idx], ...updates, updated_at: new Date().toISOString() };
  await writeFile(FILE_DB, JSON.stringify(data, null, 2));
  return data.pins[idx];
}

async function deletePin(id) {
  if (useMongo) {
    await mongoCollection.deleteOne({ _id: id });
    await mongoLinksCollection.deleteMany({ $or: [{ sourceId: id }, { targetId: id }] });
  } else {
    const data = JSON.parse(await readFile(FILE_DB, 'utf8'));
    data.pins = data.pins.filter(p => p.id !== id);
    data.links = data.links.filter(l => l.sourceId !== id && l.targetId !== id);
    await writeFile(FILE_DB, JSON.stringify(data, null, 2));
  }
}

// ── Link helpers ────────────────────────────────────────────────────
async function loadLinks() {
  if (useMongo) {
    const docs = await mongoLinksCollection.find({}).toArray();
    return docs.map(d => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest };
    });
  }
  try {
    const data = JSON.parse(await readFile(FILE_DB, 'utf8'));
    return data.links || [];
  } catch { return []; }
}

async function saveLink(link) {
  if (useMongo) {
    await mongoLinksCollection.insertOne({ _id: link.id, ...link });
  } else {
    const data = JSON.parse(await readFile(FILE_DB, 'utf8'));
    data.links.push(link);
    await writeFile(FILE_DB, JSON.stringify(data, null, 2));
  }
}

async function deleteLink(id) {
  if (useMongo) {
    await mongoLinksCollection.deleteOne({ _id: id });
  } else {
    const data = JSON.parse(await readFile(FILE_DB, 'utf8'));
    data.links = data.links.filter(l => l.id !== id);
    await writeFile(FILE_DB, JSON.stringify(data, null, 2));
  }
}

// ── SSE clients ─────────────────────────────────────────────────────
const clients = [];

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
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

// ── Pin routes ──────────────────────────────────────────────────────
app.get('/api/pins', async (req, res) => {
  const pins = await loadPins();
  res.json(pins);
});

app.post('/api/pins', async (req, res) => {
  const pin = {
    id: `pin-${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };
  await savePin(pin);
  broadcast({ type: 'pin-added', pin });
  res.json(pin);
});

app.delete('/api/pins/:id', async (req, res) => {
  await deletePin(req.params.id);
  broadcast({ type: 'pin-deleted', id: req.params.id });
  res.json({ ok: true });
});

app.put('/api/pins/:id', async (req, res) => {
  const updated = await updatePin(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Intel not found' });
  broadcast({ type: 'pin-updated', pin: updated });
  res.json(updated);
});

// ── Link routes ─────────────────────────────────────────────────────
app.get('/api/links', async (req, res) => {
  const links = await loadLinks();
  res.json(links);
});

app.post('/api/links', async (req, res) => {
  const link = {
    id: `link-${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };
  await saveLink(link);
  broadcast({ type: 'link-added', link });
  res.json(link);
});

app.delete('/api/links/:id', async (req, res) => {
  await deleteLink(req.params.id);
  broadcast({ type: 'link-deleted', id: req.params.id });
  res.json({ ok: true });
});

// ── SSE ─────────────────────────────────────────────────────────────
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
await initDB();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`◉ OLORIN v2.0 — Union Intelligence Grid`);
  console.log(`  Storage: ${useMongo ? 'MongoDB (persistent)' : 'FILE (ephemeral)'}`);
  console.log(`  Chicago Sector online at http://localhost:${PORT}`);
});
