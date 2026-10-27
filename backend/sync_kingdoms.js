const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

function syncKingdoms(defaultActiveCount = null) {
  const kingdomsJsonPath = path.join(__dirname, '../frontend/nirvana_frontend/src/data/kingdoms.json');
  if (!fs.existsSync(kingdomsJsonPath)) {
    throw new Error('kingdoms.json file not found at ' + kingdomsJsonPath);
  }

  const raw = fs.readFileSync(kingdomsJsonPath, 'utf8');
  const kingdoms = JSON.parse(raw);
  console.log(`Found ${kingdoms.length} kingdoms in kingdoms.json. Syncing into database...`);

  const txCount = db.prepare("SELECT COUNT(*) as cnt FROM transactions WHERE status = 'confirmed'").get().cnt;

  db.exec('BEGIN TRANSACTION');
  try {
    if (txCount === 0) {
      // Clean reload since there are no active purchase transactions
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
        // If defaultActiveCount is specified, only first N are active; otherwise all are active
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
      // Transactions exist - upsert so we don't break foreign key constraints
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

    // Set first active kingdom in auction state
    const firstActive = db.prepare('SELECT id, base_price FROM kingdoms WHERE is_active = 1 ORDER BY order_num ASC, id ASC LIMIT 1').get();
    if (firstActive) {
      db.prepare(`
        UPDATE auction_state
        SET current_kingdom_id = ?, current_price = ?, status = 'idle', round_number = 1
        WHERE id = 1
      `).run(firstActive.id, firstActive.base_price);
    }

    db.exec('COMMIT');
    console.log(`Successfully synced ${kingdoms.length} kingdoms into SQLite database.`);
    return { success: true, count: kingdoms.length };
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Failed to sync kingdoms:', err);
    throw err;
  }
}

if (require.main === module) {
  syncKingdoms();
}

module.exports = { syncKingdoms };
