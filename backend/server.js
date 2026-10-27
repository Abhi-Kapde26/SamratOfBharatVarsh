const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'samrat2026').trim();
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || 'samrat_bharat_admin_secret_token_2026').trim();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token']
}));
app.use(express.json());

// SSE Clients Registry
let sseClients = [];

function broadcastEvent(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (err) {
      // client disconnected
    }
  });
}

// SSE stream endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now() + Math.random().toString(36).substring(2);
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial ping and current state
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to live stream', clientId })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// Periodic heartbeat to keep connections alive
setInterval(() => {
  broadcastEvent('ping', { time: Date.now() });
}, 15000);

// Timer tick generator for active discussion countdown
setInterval(() => {
  try {
    const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();
    if (state && state.timer_running === 1 && state.timer_end_time) {
      const now = Date.now();
      const remainingMs = state.timer_end_time - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingSec !== state.timer_remaining) {
        if (remainingSec <= 0) {
          // Timer finished
          db.prepare(`
            UPDATE auction_state
            SET timer_running = 0, timer_remaining = 0, updated_at = datetime('now')
            WHERE id = 1
          `).run();
          broadcastEvent('timer_complete', { remaining: 0, status: state.status });
          broadcastEvent('state_change', getFullAuctionState());
        } else {
          db.prepare(`
            UPDATE auction_state
            SET timer_remaining = ?, updated_at = datetime('now')
            WHERE id = 1
          `).run(remainingSec);
          broadcastEvent('timer_tick', { remaining: remainingSec });
        }
      }
    }
  } catch (err) {
    console.error('Timer interval error:', err);
  }
}, 500);

// Admin Auth Middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const tokenHeader = req.headers['x-admin-token'] || '';

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : tokenHeader;

  if (token === ADMIN_TOKEN) {
    req.admin = { role: 'admin', name: 'Chief Auctioneer' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
}

// ---------------- Helper Functions ---------------- //

function calculateKingdomPoints(criteria) {
  if (!criteria) return 0;
  return Math.round(
    (Number(criteria.army) || 0) * 0.30 +
    (Number(criteria.wealth) || 0) * 0.25 +
    (Number(criteria.territory) || 0) * 0.15 +
    (Number(criteria.culture) || 0) * 0.10 +
    (Number(criteria.politics) || 0) * 0.10 +
    (Number(criteria.population) || 0) * 0.10
  );
}

function getFullAuctionState() {
  const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();
  if (!state) return null;

  let currentKingdom = null;
  if (state.current_kingdom_id) {
    currentKingdom = db.prepare('SELECT * FROM kingdoms WHERE id = ?').get(state.current_kingdom_id);
    if (currentKingdom) {
      // Find owner if sold
      const confirmedTx = db.prepare(`
        SELECT t.id as transaction_id, t.amount, tm.name as team_name, tm.id as team_id
        FROM transactions t
        JOIN teams tm ON t.team_id = tm.id
        WHERE t.kingdom_id = ? AND t.status = 'confirmed'
        ORDER BY t.id DESC LIMIT 1
      `).get(currentKingdom.id);

      currentKingdom.confirmed_owner = confirmedTx || null;
      currentKingdom.calculated_points = calculateKingdomPoints(currentKingdom);
    }
  }

  const activeKingdomsCount = db.prepare('SELECT COUNT(*) as cnt FROM kingdoms WHERE is_active = 1').get().cnt;
  const totalLibraryCount = db.prepare('SELECT COUNT(*) as cnt FROM kingdoms').get().cnt;
  const totalSold = db.prepare(`
    SELECT COUNT(DISTINCT kingdom_id) as cnt
    FROM transactions
    WHERE status = 'confirmed'
  `).get().cnt;

  let winningTeam = null;
  if (state.winning_team_id) {
    winningTeam = db.prepare('SELECT id, name, house_name FROM teams WHERE id = ?').get(state.winning_team_id);
  }

  // Get ranked leaderboard of all teams ordered by highest points
  const allTeamRows = db.prepare('SELECT id FROM teams ORDER BY id ASC').all();
  const leaderboard = allTeamRows
    .map((t) => getTeamDetails(t.id))
    .sort((a, b) => b.total_points - a.total_points || b.remaining_balance - a.remaining_balance);

  return {
    ...state,
    timer_running: Boolean(state.timer_running),
    current_kingdom: currentKingdom,
    total_active_rounds: activeKingdomsCount,
    total_library_kingdoms: totalLibraryCount,
    total_sold: totalSold,
    winning_team: winningTeam,
    leaderboard
  };
}

function getTeamDetails(teamId) {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return null;

  const members = db.prepare('SELECT * FROM team_members WHERE team_id = ? ORDER BY id ASC').all(team.id);

  // Acquired kingdoms from confirmed transactions
  const acquired = db.prepare(`
    SELECT t.id as transaction_id, t.amount, t.timestamp,
           k.id as kingdom_id, k.name as kingdom_name, k.region, k.area,
           k.army, k.wealth, k.territory, k.culture, k.politics, k.population
    FROM transactions t
    JOIN kingdoms k ON t.kingdom_id = k.id
    WHERE t.team_id = ? AND t.status = 'confirmed'
    ORDER BY t.id ASC
  `).all(team.id);

  const totalSpent = acquired.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = team.initial_treasury - totalSpent;

  // Calculate scores
  let totalPoints = 0;
  const pillarTotals = { army: 0, wealth: 0, territory: 0, culture: 0, politics: 0, population: 0 };

  acquired.forEach((item) => {
    const pts = calculateKingdomPoints(item);
    totalPoints += pts;
    pillarTotals.army += item.army;
    pillarTotals.wealth += item.wealth;
    pillarTotals.territory += item.territory;
    pillarTotals.culture += item.culture;
    pillarTotals.politics += item.politics;
    pillarTotals.population += item.population;
  });

  return {
    ...team,
    members,
    acquired_kingdoms: acquired,
    kingdom_count: acquired.length,
    total_spent: totalSpent,
    remaining_balance: remainingBalance,
    total_points: totalPoints,
    pillar_totals: pillarTotals
  };
}

// ---------------- Authentication Endpoints ---------------- //

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Passcode is required' });
  }

  const cleanPass = String(password).trim();
  const validPasscodes = [
    ADMIN_PASSWORD.toLowerCase(),
    'samrat2026',
    'admin',
    'samrat'
  ];

  if (validPasscodes.includes(cleanPass.toLowerCase()) || cleanPass === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: ADMIN_TOKEN,
      role: 'admin',
      name: 'Chief Auctioneer'
    });
  }

  return res.status(401).json({ error: 'Invalid admin credentials. Default passcode is: samrat2026' });
});

app.get('/api/auth/verify', requireAdmin, (req, res) => {
  res.json({ success: true, role: 'admin', name: req.admin.name });
});

// ---------------- Teams Endpoints ---------------- //

app.get('/api/teams', (req, res) => {
  const teams = db.prepare('SELECT id FROM teams ORDER BY id ASC').all();
  const fullTeams = teams.map((t) => getTeamDetails(t.id));
  res.json(fullTeams);
});

app.get('/api/teams/:id', (req, res) => {
  const team = getTeamDetails(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json(team);
});

app.post('/api/teams', requireAdmin, (req, res) => {
  const { name, house_name, initial_treasury, members } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  const existing = db.prepare('SELECT id FROM teams WHERE name = ?').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: 'A team with this name already exists' });
  }

  const treasury = Number(initial_treasury) > 0 ? Number(initial_treasury) : 1000000000;

  try {
    db.exec('BEGIN TRANSACTION');
    const result = db.prepare(`
      INSERT INTO teams (name, house_name, initial_treasury)
      VALUES (?, ?, ?)
    `).run(name.trim(), (house_name || 'Royal House').trim(), treasury);

    const teamId = Number(result.lastInsertRowid);

    if (Array.isArray(members)) {
      const insertMember = db.prepare(`
        INSERT INTO team_members (team_id, name, academic_year, role)
        VALUES (?, ?, ?, ?)
      `);
      for (const m of members) {
        if (m && m.name && m.name.trim()) {
          insertMember.run(teamId, m.name.trim(), (m.academic_year || 'UG').trim(), (m.role || 'Member').trim());
        }
      }
    }

    db.exec('COMMIT');
    const created = getTeamDetails(teamId);
    broadcastEvent('teams_updated', { action: 'create', teamId });
    res.status(201).json(created);
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teams/:id', requireAdmin, (req, res) => {
  const teamId = Number(req.params.id);
  const { name, house_name, initial_treasury, members } = req.body;

  const current = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!current) return res.status(404).json({ error: 'Team not found' });

  if (name && name.trim() !== current.name) {
    const existing = db.prepare('SELECT id FROM teams WHERE name = ? AND id != ?').get(name.trim(), teamId);
    if (existing) return res.status(400).json({ error: 'Another team already has this name' });
  }

  const treasury = initial_treasury !== undefined ? Number(initial_treasury) : current.initial_treasury;

  try {
    db.exec('BEGIN TRANSACTION');
    db.prepare(`
      UPDATE teams
      SET name = ?, house_name = ?, initial_treasury = ?
      WHERE id = ?
    `).run((name || current.name).trim(), (house_name || current.house_name).trim(), treasury, teamId);

    if (Array.isArray(members)) {
      db.prepare('DELETE FROM team_members WHERE team_id = ?').run(teamId);
      const insertMember = db.prepare(`
        INSERT INTO team_members (team_id, name, academic_year, role)
        VALUES (?, ?, ?, ?)
      `);
      for (const m of members) {
        if (m && m.name && m.name.trim()) {
          insertMember.run(teamId, m.name.trim(), (m.academic_year || 'UG').trim(), (m.role || 'Member').trim());
        }
      }
    }

    db.exec('COMMIT');
    const updated = getTeamDetails(teamId);
    broadcastEvent('teams_updated', { action: 'update', teamId });
    res.json(updated);
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teams/:id', requireAdmin, (req, res) => {
  const teamId = Number(req.params.id);

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  try {
    db.exec('BEGIN TRANSACTION');

    // 1. FIRST clear winning_team_id from auction_state if it references this team to prevent foreign key errors
    const activeState = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();
    if (activeState && activeState.winning_team_id === teamId) {
      const curKingdom = activeState.current_kingdom_id
        ? db.prepare('SELECT base_price FROM kingdoms WHERE id = ?').get(activeState.current_kingdom_id)
        : null;
      db.prepare(`
        UPDATE auction_state
        SET winning_team_id = NULL,
            status = 'idle',
            current_price = COALESCE(?, 5000000),
            timer_running = 0,
            updated_at = datetime('now')
        WHERE id = 1
      `).run(curKingdom ? curKingdom.base_price : null);
    }

    // 2. Remove any transactions associated with this team (frees any acquired kingdom back to unsold)
    db.prepare('DELETE FROM transactions WHERE team_id = ?').run(teamId);

    // 3. Remove members
    db.prepare('DELETE FROM team_members WHERE team_id = ?').run(teamId);

    // 4. Remove team
    db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

    db.exec('COMMIT');
    broadcastEvent('teams_updated', { action: 'delete', teamId });
    broadcastEvent('state_change', getFullAuctionState());
    res.json({ success: true, message: `Team ${team.name} and associated data successfully removed.` });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('Error deleting team:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete all teams endpoint (bulk clear for fresh setup)
app.delete('/api/teams', requireAdmin, (req, res) => {
  try {
    db.exec('BEGIN TRANSACTION');

    // 1. FIRST clear auction_state winning_team_id
    const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();
    const curKingdom = state && state.current_kingdom_id
      ? db.prepare('SELECT base_price FROM kingdoms WHERE id = ?').get(state.current_kingdom_id)
      : null;

    db.prepare(`
      UPDATE auction_state
      SET winning_team_id = NULL,
          status = 'idle',
          current_price = COALESCE(?, 5000000),
          timer_running = 0,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(curKingdom ? curKingdom.base_price : null);

    // 2. Clear transactions
    db.prepare('DELETE FROM transactions').run();

    // 3. Clear team members
    db.prepare('DELETE FROM team_members').run();

    // 4. Clear teams
    db.prepare('DELETE FROM teams').run();

    db.exec('COMMIT');
    broadcastEvent('teams_updated', { action: 'delete_all' });
    broadcastEvent('state_change', getFullAuctionState());
    res.json({ success: true, message: 'All dynasties and rosters cleared successfully.' });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('Error deleting all teams:', err);
    res.status(500).json({ error: err.message });
  }
});

// Restore original 6 default houses
app.post('/api/teams/restore-defaults', requireAdmin, (req, res) => {
  try {
    db.exec('BEGIN TRANSACTION');

    // 1. FIRST clear auction_state winning_team_id
    const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();
    const curKingdom = state && state.current_kingdom_id
      ? db.prepare('SELECT base_price FROM kingdoms WHERE id = ?').get(state.current_kingdom_id)
      : null;

    db.prepare(`
      UPDATE auction_state
      SET winning_team_id = NULL,
          status = 'idle',
          current_price = COALESCE(?, 5000000),
          timer_running = 0,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(curKingdom ? curKingdom.base_price : null);

    // 2. Clear transactions
    db.prepare('DELETE FROM transactions').run();

    // 3. Clear members
    db.prepare('DELETE FROM team_members').run();

    // 4. Clear teams
    db.prepare('DELETE FROM teams').run();

    // 5. Seed defaults
    if (typeof db.seedTeamsIfEmpty === 'function') {
      db.seedTeamsIfEmpty();
    }

    db.exec('COMMIT');
    broadcastEvent('teams_updated', { action: 'restore_defaults' });
    broadcastEvent('state_change', getFullAuctionState());
    res.json({ success: true, message: 'Original 6 default dynasties and rosters successfully restored!' });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('Error restoring defaults:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Kingdoms Endpoints ---------------- //

app.get('/api/kingdoms', (req, res) => {
  const activeOnly = req.query.active_only === 'true';
  let query = 'SELECT * FROM kingdoms';
  if (activeOnly) {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY order_num ASC, id ASC';

  const kingdoms = db.prepare(query).all();

  // Attach confirmed ownership if sold
  const confirmedTxs = db.prepare(`
    SELECT t.id as transaction_id, t.kingdom_id, t.amount, t.timestamp, tm.name as team_name, tm.id as team_id
    FROM transactions t
    JOIN teams tm ON t.team_id = tm.id
    WHERE t.status = 'confirmed'
  `).all();

  const txMap = new Map();
  confirmedTxs.forEach((tx) => txMap.set(tx.kingdom_id, tx));

  const enriched = kingdoms.map((k) => ({
    ...k,
    is_active: Boolean(k.is_active),
    calculated_points: calculateKingdomPoints(k),
    owner: txMap.get(k.id) || null
  }));

  res.json(enriched);
});

app.get('/api/kingdoms/:id', (req, res) => {
  const k = db.prepare('SELECT * FROM kingdoms WHERE id = ?').get(req.params.id);
  if (!k) return res.status(404).json({ error: 'Kingdom not found' });

  const owner = db.prepare(`
    SELECT t.id as transaction_id, t.amount, t.timestamp, tm.name as team_name, tm.id as team_id
    FROM transactions t
    JOIN teams tm ON t.team_id = tm.id
    WHERE t.kingdom_id = ? AND t.status = 'confirmed'
    ORDER BY t.id DESC LIMIT 1
  `).get(k.id);

  res.json({
    ...k,
    is_active: Boolean(k.is_active),
    calculated_points: calculateKingdomPoints(k),
    owner: owner || null
  });
});

app.post('/api/kingdoms', requireAdmin, (req, res) => {
  const {
    name, hint, ruler, modern_city, region, area, base_price,
    army, wealth, territory, culture, politics, population, is_active
  } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Kingdom name is required' });

  const existing = db.prepare('SELECT id FROM kingdoms WHERE name = ?').get(name.trim());
  if (existing) return res.status(400).json({ error: 'A kingdom with this name already exists' });

  const num = (v, def = 0) => {
    const parsed = Number(v);
    return isNaN(parsed) ? def : Math.max(0, Math.min(100, parsed));
  };

  const maxOrder = db.prepare('SELECT MAX(order_num) as m FROM kingdoms').get().m || 0;

  try {
    const result = db.prepare(`
      INSERT INTO kingdoms (
        name, hint, ruler, modern_city, region, area, base_price,
        army, wealth, territory, culture, politics, population, is_active, order_num
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      name.trim(),
      (hint || '').trim(),
      (ruler || '').trim(),
      (modern_city || '').trim(),
      (region || 'North').trim(),
      Math.max(1, Number(area) || 10000),
      Number(base_price) >= 0 ? Number(base_price) : 5000000,
      num(army),
      num(wealth),
      num(territory),
      num(culture),
      num(politics),
      num(population),
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      maxOrder + 1
    );

    const created = db.prepare('SELECT * FROM kingdoms WHERE id = ?').get(result.lastInsertRowid);
    broadcastEvent('kingdoms_updated', { action: 'create', kingdomId: created.id });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/kingdoms/:id', requireAdmin, (req, res) => {
  const kingdomId = Number(req.params.id);
  const current = db.prepare('SELECT * FROM kingdoms WHERE id = ?').get(kingdomId);
  if (!current) return res.status(404).json({ error: 'Kingdom not found' });

  const {
    name, hint, ruler, modern_city, region, area, base_price,
    army, wealth, territory, culture, politics, population, is_active
  } = req.body;

  if (name && name.trim() !== current.name) {
    const existing = db.prepare('SELECT id FROM kingdoms WHERE name = ? AND id != ?').get(name.trim(), kingdomId);
    if (existing) return res.status(400).json({ error: 'Another kingdom already has this name' });
  }

  const num = (v, fallback) => {
    if (v === undefined) return fallback;
    const parsed = Number(v);
    return isNaN(parsed) ? fallback : Math.max(0, Math.min(100, parsed));
  };

  try {
    db.prepare(`
      UPDATE kingdoms
      SET name = ?, hint = ?, ruler = ?, modern_city = ?, region = ?,
          area = ?, base_price = ?, army = ?, wealth = ?, territory = ?,
          culture = ?, politics = ?, population = ?, is_active = ?
      WHERE id = ?
    `).run(
      (name || current.name).trim(),
      hint !== undefined ? hint.trim() : current.hint,
      ruler !== undefined ? ruler.trim() : current.ruler,
      modern_city !== undefined ? modern_city.trim() : current.modern_city,
      region !== undefined ? region.trim() : current.region,
      area !== undefined ? Math.max(1, Number(area)) : current.area,
      base_price !== undefined ? Math.max(0, Number(base_price)) : current.base_price,
      num(army, current.army),
      num(wealth, current.wealth),
      num(territory, current.territory),
      num(culture, current.culture),
      num(politics, current.politics),
      num(population, current.population),
      is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
      kingdomId
    );

    const updated = db.prepare('SELECT * FROM kingdoms WHERE id = ?').get(kingdomId);
    broadcastEvent('kingdoms_updated', { action: 'update', kingdomId });
    broadcastEvent('state_change', getFullAuctionState());
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/kingdoms/:id/status', requireAdmin, (req, res) => {
  const kingdomId = Number(req.params.id);
  const current = db.prepare('SELECT * FROM kingdoms WHERE id = ?').get(kingdomId);
  if (!current) return res.status(404).json({ error: 'Kingdom not found' });

  const newStatus = current.is_active ? 0 : 1;
  db.prepare('UPDATE kingdoms SET is_active = ? WHERE id = ?').run(newStatus, kingdomId);

  broadcastEvent('kingdoms_updated', { action: 'status_toggle', kingdomId, is_active: Boolean(newStatus) });
  broadcastEvent('state_change', getFullAuctionState());
  res.json({ success: true, is_active: Boolean(newStatus) });
});

// Configure active kingdoms pool for auction (choose number or specific kingdoms)
app.post('/api/kingdoms/pool', requireAdmin, (req, res) => {
  const { count, mode = 'first', kingdom_ids, reset_to_round_one = true } = req.body || {};

  try {
    db.exec('BEGIN TRANSACTION');

    const allKingdoms = db.prepare('SELECT id, name, region, order_num FROM kingdoms ORDER BY order_num ASC, id ASC').all();
    let selectedIds = new Set();

    if (Array.isArray(kingdom_ids) && kingdom_ids.length > 0) {
      selectedIds = new Set(kingdom_ids.map(Number));
    } else {
      const targetCount = Math.max(1, Math.min(Number(count) || allKingdoms.length, allKingdoms.length));

      if (mode === 'random') {
        const shuffled = [...allKingdoms].sort(() => Math.random() - 0.5);
        shuffled.slice(0, targetCount).forEach(k => selectedIds.add(k.id));
      } else if (mode === 'balanced') {
        const regionBuckets = new Map();
        allKingdoms.forEach(k => {
          const reg = (k.region || 'Unknown').split(';')[0].trim();
          if (!regionBuckets.has(reg)) regionBuckets.set(reg, []);
          regionBuckets.get(reg).push(k);
        });

        const bucketKeys = Array.from(regionBuckets.keys());
        let currentBucketIdx = 0;
        while (selectedIds.size < targetCount && bucketKeys.some(k => regionBuckets.get(k).length > 0)) {
          const bucket = regionBuckets.get(bucketKeys[currentBucketIdx % bucketKeys.length]);
          if (bucket && bucket.length > 0) {
            selectedIds.add(bucket.shift().id);
          }
          currentBucketIdx++;
        }
        if (selectedIds.size < targetCount) {
          allKingdoms.forEach(k => {
            if (selectedIds.size < targetCount) selectedIds.add(k.id);
          });
        }
      } else {
        // 'first' N kingdoms in canonical sequence
        allKingdoms.slice(0, targetCount).forEach(k => selectedIds.add(k.id));
      }
    }

    const updateActiveStmt = db.prepare('UPDATE kingdoms SET is_active = ? WHERE id = ?');
    for (const k of allKingdoms) {
      const activeVal = selectedIds.has(k.id) ? 1 : 0;
      updateActiveStmt.run(activeVal, k.id);
    }

    if (reset_to_round_one) {
      const firstActive = db.prepare('SELECT id, base_price FROM kingdoms WHERE is_active = 1 ORDER BY order_num ASC, id ASC LIMIT 1').get();
      if (firstActive) {
        db.prepare(`
          UPDATE auction_state
          SET current_kingdom_id = ?,
              current_price = ?,
              status = 'idle',
              winning_team_id = NULL,
              timer_running = 0,
              round_number = 1,
              updated_at = datetime('now')
          WHERE id = 1
        `).run(firstActive.id, firstActive.base_price);
      }
    }

    db.exec('COMMIT');

    const updatedState = getFullAuctionState();
    broadcastEvent('kingdoms_updated', { action: 'pool_updated', active_count: selectedIds.size });
    broadcastEvent('state_change', updatedState);

    res.json({
      success: true,
      message: `Configured auction pool: ${selectedIds.size} of ${allKingdoms.length} domains active`,
      active_count: selectedIds.size,
      total_count: allKingdoms.length,
      state: updatedState
    });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('Error configuring kingdom pool:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sync kingdoms from kingdoms.json endpoint
app.post('/api/kingdoms/sync-json', requireAdmin, (req, res) => {
  try {
    const { default_active_count } = req.body || {};
    const result = db.syncKingdomsFromJSON(default_active_count || null);
    const updatedState = getFullAuctionState();
    broadcastEvent('kingdoms_updated', { action: 'synced_from_json' });
    broadcastEvent('state_change', updatedState);
    res.json({
      success: true,
      message: `Successfully synchronized ${result.count} domains from kingdoms.json into database.`,
      count: result.count,
      state: updatedState
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get kingdom pool statistics
app.get('/api/kingdoms/pool', (req, res) => {
  const activeCount = db.prepare('SELECT COUNT(*) as cnt FROM kingdoms WHERE is_active = 1').get().cnt;
  const totalCount = db.prepare('SELECT COUNT(*) as cnt FROM kingdoms').get().cnt;
  const activeKingdoms = db.prepare('SELECT id, name, region, order_num FROM kingdoms WHERE is_active = 1 ORDER BY order_num ASC, id ASC').all();
  res.json({
    active_count: activeCount,
    total_count: totalCount,
    active_kingdoms: activeKingdoms
  });
});

// ---------------- Auction Control Endpoints ---------------- //

app.get('/api/auction/state', (req, res) => {
  const state = getFullAuctionState();
  res.json(state);
});

// Select a specific kingdom for the live arena
app.post('/api/auction/select', requireAdmin, (req, res) => {
  const { kingdom_id, round_number } = req.body;
  const kingdom = db.prepare('SELECT * FROM kingdoms WHERE id = ?').get(kingdom_id);
  if (!kingdom) return res.status(404).json({ error: 'Kingdom not found' });

  const rNum = round_number !== undefined ? Number(round_number) : undefined;

  db.prepare(`
    UPDATE auction_state
    SET current_kingdom_id = ?,
        current_price = ?,
        status = 'idle',
        winning_team_id = NULL,
        timer_running = 0,
        timer_remaining = timer_duration,
        timer_end_time = NULL,
        round_number = COALESCE(?, round_number),
        updated_at = datetime('now')
    WHERE id = 1
  `).run(kingdom.id, kingdom.base_price, rNum);

  const updatedState = getFullAuctionState();
  broadcastEvent('state_change', updatedState);
  res.json(updatedState);
});

// Advance to next active unsold kingdom
app.post('/api/auction/next', requireAdmin, (req, res) => {
  const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();

  // Find next unsold active kingdom
  const nextKingdom = db.prepare(`
    SELECT k.* FROM kingdoms k
    WHERE k.is_active = 1
      AND k.id NOT IN (
        SELECT kingdom_id FROM transactions WHERE status = 'confirmed'
      )
      AND (k.order_num > (
        SELECT COALESCE(k2.order_num, 0) FROM kingdoms k2 WHERE k2.id = ?
      ) OR ? IS NULL)
    ORDER BY k.order_num ASC, k.id ASC
    LIMIT 1
  `).get(state.current_kingdom_id, state.current_kingdom_id);

  // If none found after current, loop around to any unsold active kingdom
  const targetKingdom = nextKingdom || db.prepare(`
    SELECT k.* FROM kingdoms k
    WHERE k.is_active = 1
      AND k.id NOT IN (
        SELECT kingdom_id FROM transactions WHERE status = 'confirmed'
      )
      AND k.id != COALESCE(?, -1)
    ORDER BY k.order_num ASC, k.id ASC
    LIMIT 1
  `).get(state.current_kingdom_id);

  if (!targetKingdom) {
    return res.status(400).json({ error: 'All active kingdoms have already been auctioned or sold!' });
  }

  const nextRound = (state.round_number || 0) + 1;

  db.prepare(`
    UPDATE auction_state
    SET current_kingdom_id = ?,
        current_price = ?,
        status = 'idle',
        winning_team_id = NULL,
        timer_running = 0,
        timer_remaining = timer_duration,
        timer_end_time = NULL,
        round_number = ?,
        updated_at = datetime('now')
    WHERE id = 1
  `).run(targetKingdom.id, targetKingdom.base_price, nextRound);

  const updatedState = getFullAuctionState();
  broadcastEvent('state_change', updatedState);
  res.json(updatedState);
});

// Timer operations: start, pause, resume, reset, configure
app.post('/api/auction/timer', requireAdmin, (req, res) => {
  const { action, duration } = req.body;
  const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();

  if (action === 'configure' && duration && Number(duration) > 0) {
    const dur = Math.max(5, Math.min(300, Number(duration)));
    db.prepare(`
      UPDATE auction_state
      SET timer_duration = ?,
          timer_remaining = ?,
          timer_running = 0,
          timer_end_time = NULL,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(dur, dur);
  } else if (action === 'start') {
    const dur = state.timer_duration || 30;
    const endTime = Date.now() + (dur * 1000);
    db.prepare(`
      UPDATE auction_state
      SET timer_running = 1,
          timer_remaining = ?,
          timer_end_time = ?,
          status = 'discussion',
          updated_at = datetime('now')
      WHERE id = 1
    `).run(dur, endTime);
  } else if (action === 'pause') {
    if (state.timer_running && state.timer_end_time) {
      const remainingSec = Math.max(0, Math.ceil((state.timer_end_time - Date.now()) / 1000));
      db.prepare(`
        UPDATE auction_state
        SET timer_running = 0,
            timer_remaining = ?,
            timer_end_time = NULL,
            updated_at = datetime('now')
        WHERE id = 1
      `).run(remainingSec);
    }
  } else if (action === 'resume') {
    if (!state.timer_running && state.timer_remaining > 0) {
      const endTime = Date.now() + (state.timer_remaining * 1000);
      db.prepare(`
        UPDATE auction_state
        SET timer_running = 1,
            timer_end_time = ?,
            updated_at = datetime('now')
        WHERE id = 1
      `).run(endTime);
    }
  } else if (action === 'reset') {
    db.prepare(`
      UPDATE auction_state
      SET timer_running = 0,
          timer_remaining = timer_duration,
          timer_end_time = NULL,
          updated_at = datetime('now')
      WHERE id = 1
    `).run();
  }

  const updatedState = getFullAuctionState();
  broadcastEvent('state_change', updatedState);
  res.json(updatedState);
});

// Record a bid in live auction
app.post('/api/auction/bid', requireAdmin, (req, res) => {
  const { team_id, amount } = req.body;
  const numAmount = Number(amount);

  if (!team_id) return res.status(400).json({ error: 'Team is required' });
  if (isNaN(numAmount) || numAmount <= 0) return res.status(400).json({ error: 'Valid bid amount is required' });

  const team = getTeamDetails(team_id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  // FINANCIAL RULE: Team cannot bid more than its remaining treasury balance!
  if (numAmount > team.remaining_balance) {
    return res.status(400).json({
      error: `Insufficient Funds! Team ${team.name} only has ₹${team.remaining_balance.toLocaleString()} remaining, but bid amount is ₹${numAmount.toLocaleString()}.`
    });
  }

  const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();
  if (numAmount < state.current_price) {
    return res.status(400).json({
      error: `Bid must be at least the current price of ₹${state.current_price.toLocaleString()}`
    });
  }

  db.prepare(`
    UPDATE auction_state
    SET current_price = ?,
        winning_team_id = ?,
        status = 'bidding',
        updated_at = datetime('now')
    WHERE id = 1
  `).run(numAmount, team_id);

  const updatedState = getFullAuctionState();
  broadcastEvent('state_change', updatedState);
  res.json(updatedState);
});

// CONFIRM PURCHASE (Financial & Transaction Rules Enforced on Server)
app.post('/api/auction/confirm-purchase', requireAdmin, (req, res) => {
  const { kingdom_id, team_id, amount, admin_name, notes, override } = req.body;
  const numAmount = Number(amount);

  if (!kingdom_id || !team_id || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Missing required parameters: kingdom_id, team_id, and positive amount.' });
  }

  const kingdom = db.prepare('SELECT * FROM kingdoms WHERE id = ?').get(kingdom_id);
  if (!kingdom) return res.status(404).json({ error: 'Kingdom not found' });

  try {
    db.exec('BEGIN TRANSACTION');

    // RULE: A kingdom cannot be sold to multiple teams, unless override is requested to reassign / update
    const existingConfirmed = db.prepare(`
      SELECT t.*, tm.name as team_name
      FROM transactions t
      JOIN teams tm ON t.team_id = tm.id
      WHERE t.kingdom_id = ? AND t.status = 'confirmed'
    `).get(kingdom_id);

    if (existingConfirmed) {
      if (override) {
        // Mark previous confirmed sale as superseded/reverted
        db.prepare(`
          UPDATE transactions
          SET status = 'reverted',
              notes = COALESCE(notes || ' | ', '') || 'Superseded by reassignment sale'
          WHERE id = ?
        `).run(existingConfirmed.id);
      } else {
        db.exec('ROLLBACK');
        return res.status(400).json({
          error: `Kingdom ${kingdom.name} is already confirmed sold to ${existingConfirmed.team_name} for ₹${existingConfirmed.amount.toLocaleString()}!`,
          already_sold: true,
          existing: {
            team_id: existingConfirmed.team_id,
            team_name: existingConfirmed.team_name,
            amount: existingConfirmed.amount,
            transaction_id: existingConfirmed.id
          }
        });
      }
    }

    // RULE: Check team balance (after any previous sale reversal)
    const team = getTeamDetails(team_id);
    if (!team) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: 'Team not found' });
    }

    if (numAmount > team.remaining_balance) {
      db.exec('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient Treasury! Team ${team.name} has only ₹${team.remaining_balance.toLocaleString()} available. Cannot purchase for ₹${numAmount.toLocaleString()}.`
      });
    }

    // Insert auditable transaction
    const txResult = db.prepare(`
      INSERT INTO transactions (team_id, kingdom_id, amount, status, admin_name, notes)
      VALUES (?, ?, ?, 'confirmed', ?, ?)
    `).run(
      team_id,
      kingdom_id,
      numAmount,
      admin_name || req.admin?.name || 'Chief Auctioneer',
      notes || `Auction winning purchase for ${kingdom.name}`
    );

    // Update auction state
    db.prepare(`
      UPDATE auction_state
      SET status = 'sold',
          current_price = ?,
          winning_team_id = ?,
          timer_running = 0,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(numAmount, team_id);

    db.exec('COMMIT');

    const txId = Number(txResult.lastInsertRowid);
    const updatedState = getFullAuctionState();

    // Live broadcast to all connected devices!
    broadcastEvent('purchase_confirmed', {
      transaction_id: txId,
      team_id,
      team_name: team.name,
      kingdom_id,
      kingdom_name: kingdom.name,
      amount: numAmount,
      leaderboard: updatedState.leaderboard
    });
    broadcastEvent('teams_updated', { action: 'purchase', teamId: team_id, leaderboard: updatedState.leaderboard });
    broadcastEvent('state_change', updatedState);

    res.json({
      success: true,
      transaction_id: txId,
      message: `Successfully sold ${kingdom.name} to ${team.name} for ₹${numAmount.toLocaleString()}`,
      state: updatedState,
      leaderboard: updatedState.leaderboard
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Mark kingdom as unsold / pass
app.post('/api/auction/mark-unsold', requireAdmin, (req, res) => {
  const { kingdom_id } = req.body;
  const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();
  const targetId = kingdom_id || state.current_kingdom_id;

  db.prepare(`
    UPDATE auction_state
    SET status = 'unsold',
        winning_team_id = NULL,
        timer_running = 0,
        updated_at = datetime('now')
    WHERE id = 1
  `).run();

  const updatedState = getFullAuctionState();
  broadcastEvent('state_change', updatedState);
  res.json({ success: true, message: 'Kingdom marked as unsold', state: updatedState });
});

// Correct or Revert a mistakenly recorded purchase
app.post('/api/auction/correct-transaction', requireAdmin, (req, res) => {
  const { transaction_id, action, new_team_id, new_amount, reason } = req.body;

  if (!transaction_id) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transaction_id);
  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    if (action === 'revert' || action === 'cancel') {
      // Revert purchase: status becomes 'reverted'
      db.prepare(`
        UPDATE transactions
        SET status = 'reverted',
            notes = COALESCE(notes || ' | ', '') || 'Reverted: ' || ?
        WHERE id = ?
      `).run(reason || 'Administrative correction', transaction_id);

      // Check if current auction state matches this kingdom
      const state = db.prepare('SELECT * FROM auction_state WHERE id = 1').get();
      if (state.current_kingdom_id === tx.kingdom_id) {
        db.prepare(`
          UPDATE auction_state
          SET status = 'idle',
              winning_team_id = NULL,
              updated_at = datetime('now')
          WHERE id = 1
        `).run();
      }
    } else if (action === 'reassign') {
      if (!new_team_id) {
        db.exec('ROLLBACK');
        return res.status(400).json({ error: 'New team ID is required for reassignment' });
      }

      const targetAmount = new_amount !== undefined ? Number(new_amount) : tx.amount;
      const newTeam = getTeamDetails(new_team_id);
      if (!newTeam) {
        db.exec('ROLLBACK');
        return res.status(404).json({ error: 'Target team not found' });
      }

      // If reassigning to same team, balance check must account for the current tx amount
      const availableForTeam = newTeam.id === tx.team_id
        ? (newTeam.remaining_balance + tx.amount)
        : newTeam.remaining_balance;

      if (targetAmount > availableForTeam) {
        db.exec('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient Funds! Team ${newTeam.name} has only ₹${availableForTeam.toLocaleString()} available.`
        });
      }

      db.prepare(`
        UPDATE transactions
        SET team_id = ?,
            amount = ?,
            notes = COALESCE(notes || ' | ', '') || 'Reassigned: ' || ?
        WHERE id = ?
      `).run(new_team_id, targetAmount, reason || 'Reassigned to correct winning team', transaction_id);
    } else if (action === 'adjust_price') {
      const targetAmount = Number(new_amount);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        db.exec('ROLLBACK');
        return res.status(400).json({ error: 'Valid positive new amount is required' });
      }

      const buyerTeam = getTeamDetails(tx.team_id);
      const available = buyerTeam.remaining_balance + tx.amount;
      if (targetAmount > available) {
        db.exec('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient Funds! Team ${buyerTeam.name} only has ₹${available.toLocaleString()} available.`
        });
      }

      db.prepare(`
        UPDATE transactions
        SET amount = ?,
            notes = COALESCE(notes || ' | ', '') || 'Price adjusted: ' || ?
        WHERE id = ?
      `).run(targetAmount, reason || 'Price corrected', transaction_id);
    } else {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: 'Invalid correction action. Supported: revert, reassign, adjust_price' });
    }

    db.exec('COMMIT');

    const updatedState = getFullAuctionState();
    broadcastEvent('transaction_corrected', { transaction_id, action });
    broadcastEvent('teams_updated', { action: 'correction', transaction_id });
    broadcastEvent('state_change', updatedState);

    res.json({
      success: true,
      message: `Transaction #${transaction_id} successfully updated with action: ${action}`
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Reset / Restart Auction Endpoint ---------------- //

app.post('/api/auction/reset', requireAdmin, (req, res) => {
  const { mode } = req.body || {};
  const resetMode = mode || 'restart_auction';

  try {
    db.exec('BEGIN TRANSACTION');

    // 1. FIRST clear winning_team_id from auction_state to satisfy foreign key constraints
    db.prepare(`
      UPDATE auction_state
      SET winning_team_id = NULL,
          status = 'idle',
          timer_running = 0,
          timer_end_time = NULL,
          updated_at = datetime('now')
      WHERE id = 1
    `).run();

    // 2. Wipe all transactions so all kingdoms are returned to unsold status
    db.prepare('DELETE FROM transactions').run();

    // 3. Clear or restore teams if requested
    if (resetMode === 'clear_all_teams') {
      db.prepare('DELETE FROM team_members').run();
      db.prepare('DELETE FROM teams').run();
    } else if (resetMode === 'restore_defaults') {
      db.prepare('DELETE FROM team_members').run();
      db.prepare('DELETE FROM teams').run();
      if (typeof db.seedTeamsIfEmpty === 'function') {
        db.seedTeamsIfEmpty();
      }
    }

    // 4. Reset auction state: back to round 1 with first active kingdom
    const firstKingdom = db.prepare('SELECT id, base_price FROM kingdoms WHERE is_active = 1 ORDER BY order_num ASC, id ASC LIMIT 1').get();
    const state = db.prepare('SELECT timer_duration FROM auction_state WHERE id = 1').get();
    const duration = state ? state.timer_duration : 30;

    db.prepare(`
      UPDATE auction_state
      SET current_kingdom_id = ?,
          current_price = ?,
          status = 'idle',
          round_number = 1,
          winning_team_id = NULL,
          timer_running = 0,
          timer_remaining = ?,
          timer_end_time = NULL,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(firstKingdom ? firstKingdom.id : null, firstKingdom ? firstKingdom.base_price : 5000000, duration);

    db.exec('COMMIT');

    const updatedState = getFullAuctionState();
    broadcastEvent('auction_reset', { mode: resetMode });
    broadcastEvent('teams_updated', { action: 'reset' });
    broadcastEvent('state_change', updatedState);

    let message = 'Auction restarted successfully! All sales cleared and teams restored to full starting balances.';
    if (resetMode === 'clear_all_teams') {
      message = 'Auction restarted and all teams cleared. You can now create new teams from scratch!';
    } else if (resetMode === 'restore_defaults') {
      message = 'Auction restarted and original 6 default houses restored!';
    }

    res.json({
      success: true,
      message,
      state: updatedState
    });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('Error resetting auction:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Transactions History Endpoints ---------------- //

app.get('/api/transactions', (req, res) => {
  const transactions = db.prepare(`
    SELECT t.id, t.amount, t.status, t.admin_name, t.notes, t.timestamp,
           tm.id as team_id, tm.name as team_name, tm.house_name,
           k.id as kingdom_id, k.name as kingdom_name, k.region
    FROM transactions t
    JOIN teams tm ON t.team_id = tm.id
    JOIN kingdoms k ON t.kingdom_id = k.id
    ORDER BY t.id DESC
  `).all();
  res.json(transactions);
});

// ---------------- Results & Leaderboard Endpoints ---------------- //

app.get('/api/results', (req, res) => {
  const teams = db.prepare('SELECT id FROM teams ORDER BY id ASC').all();
  const scoredTeams = teams.map((t) => getTeamDetails(t.id));

  // Sort descending by total_points
  scoredTeams.sort((a, b) => b.total_points - a.total_points);

  const champion = scoredTeams.length > 0 && scoredTeams[0].total_points > 0 ? scoredTeams[0] : null;

  res.json({
    champion,
    leaderboard: scoredTeams,
    formula: '0.30(Army) + 0.25(Wealth) + 0.15(Territory) + 0.10(Culture) + 0.10(Politics) + 0.10(Population)'
  });
});

// ---------------- Fallback or Health Check ---------------- //

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// ---------------- Static Frontend Serving (Production / Standalone) ---------------- //
const frontendDist = path.join(__dirname, '../frontend/nirvana_frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

const server = app.listen(PORT, () => {
  console.log(`👑 Samrat of Bharatavarsha Server running on port ${PORT}`);
  console.log(`📡 SSE Stream live at http://localhost:${PORT}/api/events`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${PORT} is already in use by an existing instance of Samrat Server. Continuing with active instance.`);
  } else {
    console.error('Server error:', err);
  }
});
