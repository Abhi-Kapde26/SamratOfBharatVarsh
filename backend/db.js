const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Path to sqlite file
const dbPath = path.join(__dirname, 'auction.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode if needed
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    house_name TEXT NOT NULL,
    initial_treasury REAL NOT NULL DEFAULT 1000000000, -- 100 Crore default
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    academic_year TEXT DEFAULT 'UG',
    role TEXT DEFAULT 'Member'
  );

  CREATE TABLE IF NOT EXISTS kingdoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    hint TEXT NOT NULL,
    ruler TEXT NOT NULL,
    modern_city TEXT NOT NULL,
    region TEXT NOT NULL,
    area REAL NOT NULL,
    base_price REAL NOT NULL DEFAULT 5000000, -- 50 Lakh default
    army REAL NOT NULL,
    wealth REAL NOT NULL,
    territory REAL NOT NULL,
    culture REAL NOT NULL,
    politics REAL NOT NULL,
    population REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    order_num INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS auction_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_kingdom_id INTEGER REFERENCES kingdoms(id),
    current_price REAL DEFAULT 5000000,
    status TEXT NOT NULL DEFAULT 'idle', -- 'idle', 'discussion', 'bidding', 'sold', 'unsold'
    timer_duration INTEGER NOT NULL DEFAULT 30,
    timer_end_time INTEGER DEFAULT NULL,
    timer_remaining INTEGER DEFAULT 30,
    timer_running INTEGER NOT NULL DEFAULT 0,
    round_number INTEGER NOT NULL DEFAULT 1,
    winning_team_id INTEGER REFERENCES teams(id),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    kingdom_id INTEGER NOT NULL REFERENCES kingdoms(id),
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'reverted'
    admin_name TEXT NOT NULL DEFAULT 'Chief Auctioneer',
    notes TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Insert singleton row for auction_state if not exists
  INSERT OR IGNORE INTO auction_state (id, current_kingdom_id, current_price, status, timer_duration, round_number)
  VALUES (1, NULL, 5000000, 'idle', 30, 1);
`);

// Function to synchronize kingdoms from kingdoms.json into DB
function syncKingdomsFromJSON(defaultActiveCount = null) {
  const kingdomsJsonPath = path.join(__dirname, '../frontend/nirvana_frontend/src/data/kingdoms.json');
  if (!fs.existsSync(kingdomsJsonPath)) {
    console.warn('kingdoms.json not found at', kingdomsJsonPath);
    return { success: false, count: 0 };
  }

  const raw = fs.readFileSync(kingdomsJsonPath, 'utf8');
  const kingdoms = JSON.parse(raw);
  const txCount = db.prepare("SELECT COUNT(*) as cnt FROM transactions WHERE status = 'confirmed'").get().cnt;

  db.exec('BEGIN TRANSACTION');
  try {
    if (txCount === 0) {
      db.prepare('UPDATE auction_state SET current_kingdom_id = NULL WHERE id = 1').run();
      db.prepare('DELETE FROM kingdoms').run();

      const insertStmt = db.prepare(`
        INSERT INTO kingdoms (
          name, hint, ruler, modern_city, region, area, base_price,
          army, wealth, territory, culture, politics, population, is_active, order_num
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      let order = 1;
      for (const k of kingdoms) {
        const isActive = (defaultActiveCount === null || order <= defaultActiveCount) ? 1 : 0;
        insertStmt.run(
          k.name,
          k.hint || '',
          k.ruler || '',
          k.modern_city || '',
          k.region || '',
          Number(k.area) || 0,
          k.base_price || 5000000,
          Number(k.criteria?.army) || 0,
          Number(k.criteria?.wealth) || 0,
          Number(k.criteria?.territory) || 0,
          Number(k.criteria?.culture) || 0,
          Number(k.criteria?.politics) || 0,
          Number(k.criteria?.population) || 0,
          isActive,
          order++
        );
      }
    } else {
      const upsertStmt = db.prepare(`
        INSERT INTO kingdoms (
          name, hint, ruler, modern_city, region, area, base_price,
          army, wealth, territory, culture, politics, population, is_active, order_num
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, 1, ?
        )
        ON CONFLICT(name) DO UPDATE SET
          hint = excluded.hint,
          ruler = excluded.ruler,
          modern_city = excluded.modern_city,
          region = excluded.region,
          area = excluded.area,
          army = excluded.army,
          wealth = excluded.wealth,
          territory = excluded.territory,
          culture = excluded.culture,
          politics = excluded.politics,
          population = excluded.population,
          order_num = excluded.order_num
      `);

      let order = 1;
      for (const k of kingdoms) {
        upsertStmt.run(
          k.name,
          k.hint || '',
          k.ruler || '',
          k.modern_city || '',
          k.region || '',
          Number(k.area) || 0,
          k.base_price || 5000000,
          Number(k.criteria?.army) || 0,
          Number(k.criteria?.wealth) || 0,
          Number(k.criteria?.territory) || 0,
          Number(k.criteria?.culture) || 0,
          Number(k.criteria?.politics) || 0,
          Number(k.criteria?.population) || 0,
          order++
        );
      }
    }

    const firstActive = db.prepare('SELECT id, base_price FROM kingdoms WHERE is_active = 1 ORDER BY order_num ASC, id ASC LIMIT 1').get();
    if (firstActive) {
      db.prepare(`
        UPDATE auction_state
        SET current_kingdom_id = ?, current_price = ?, status = 'idle', round_number = 1
        WHERE id = 1
      `).run(firstActive.id, firstActive.base_price);
    }

    db.exec('COMMIT');
    console.log(`Synced ${kingdoms.length} kingdoms from kingdoms.json successfully.`);
    return { success: true, count: kingdoms.length };
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Failed to sync kingdoms from kingdoms.json:', err);
    throw err;
  }
}

// Function to seed initial kingdoms if table is empty or count is out of sync
function seedKingdomsIfEmpty() {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM kingdoms').get();
  const kingdomsJsonPath = path.join(__dirname, '../frontend/nirvana_frontend/src/data/kingdoms.json');
  let expectedCount = 100;
  if (fs.existsSync(kingdomsJsonPath)) {
    try {
      const raw = fs.readFileSync(kingdomsJsonPath, 'utf8');
      expectedCount = JSON.parse(raw).length;
    } catch (_) {}
  }

  if (countRow.cnt === 0 || countRow.cnt !== expectedCount) {
    console.log(`Seeding/synchronizing ${expectedCount} kingdoms from kingdoms.json...`);
    syncKingdomsFromJSON();
  }
}

// Function to seed initial teams if table is empty
function seedTeamsIfEmpty() {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM teams').get();
  if (countRow.cnt === 0) {
    console.log('Seeding initial teams and members from original roster...');
    const initialTeams = [
      {
        name: "Marathas",
        house_name: "House of Chhatrapati",
        initial_treasury: 1000000000, // 100 Crore
        members: ["Dhruv", "Himanshu Sinha", "Naseeb", "Krish", "Kartik Kumte", "Geshna", "Shreyas Jaiswal"]
      },
      {
        name: "Kalinga",
        house_name: "House of Kharavela",
        initial_treasury: 1000000000,
        members: ["Karmanya", "Tejas", "Mayank", "Omkar", "Pratishtha", "Adi Mahalaxmi", "Aniket"]
      },
      {
        name: "Mauryas",
        house_name: "House of Chandragupta",
        initial_treasury: 1000000000,
        members: ["Himanshu Bhaiyaa", "Shekhar", "Satyam", "Utkarsh", "Abhishek", "Dhatri", "Sumedh"]
      },
      {
        name: "Yadava",
        house_name: "House of Krishna",
        initial_treasury: 1000000000,
        members: ["Kanishk Gorana", "Rajat", "Sarthak", "Devashish", "Aarush", "Daksh", "Krishmita"]
      },
      {
        name: "Gandhara",
        house_name: "House of Takshashila",
        initial_treasury: 1000000000,
        members: ["Manasa", "Prajwal Bhaiyaa", "Jiya", "Raveendra Purohit", "Atul", "Harvind", "Umang"]
      },
      {
        name: "Gupta",
        house_name: "House of Vikramaditya",
        initial_treasury: 1000000000,
        members: ["Dev", "Anant", "Srinivas", "Shudhanshu", "Medhansh", "Tanvi", "Mithil"]
      }
    ];

    const insertTeam = db.prepare(`
      INSERT INTO teams (name, house_name, initial_treasury)
      VALUES (?, ?, ?)
    `);

    const insertMember = db.prepare(`
      INSERT INTO team_members (team_id, name, academic_year, role)
      VALUES (?, ?, ?, ?)
    `);

    for (const t of initialTeams) {
      const res = insertTeam.run(t.name, t.house_name, t.initial_treasury);
      const teamId = Number(res.lastInsertRowid);
      for (const m of t.members) {
        insertMember.run(teamId, m, 'UG', 'Member');
      }
    }
    console.log('Seeded initial 6 teams with members successfully.');
  }
}

// Ensure first kingdom is loaded into auction_state if not set
function initAuctionStateIfEmpty() {
  const state = db.prepare('SELECT current_kingdom_id FROM auction_state WHERE id = 1').get();
  if (!state || !state.current_kingdom_id) {
    const firstKingdom = db.prepare('SELECT id, base_price FROM kingdoms WHERE is_active = 1 ORDER BY order_num ASC LIMIT 1').get();
    if (firstKingdom) {
      db.prepare(`
        UPDATE auction_state
        SET current_kingdom_id = ?, current_price = ?, status = 'idle', round_number = 1
        WHERE id = 1
      `).run(firstKingdom.id, firstKingdom.base_price);
    }
  }
}

seedKingdomsIfEmpty();
seedTeamsIfEmpty();
initAuctionStateIfEmpty();

db.seedTeamsIfEmpty = seedTeamsIfEmpty;
db.seedKingdomsIfEmpty = seedKingdomsIfEmpty;
db.syncKingdomsFromJSON = syncKingdomsFromJSON;

module.exports = db;
