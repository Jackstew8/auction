import 'dotenv/config'
import express from 'express'
import pg from 'pg'
import cors from 'cors'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL })

export const app = express()
app.use(cors())
app.use(express.json())

// ─── DB init ──────────────────────────────────────────────────────────────────

export async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT,
      location TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS cars (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      run TEXT DEFAULT '',
      lane TEXT DEFAULT '',
      year TEXT DEFAULT '',
      make TEXT DEFAULT '',
      model TEXT DEFAULT '',
      color TEXT DEFAULT '',
      miles TEXT DEFAULT '',
      max_bid TEXT DEFAULT '',
      mmr TEXT DEFAULT '',
      interest TEXT DEFAULT 'maybe',
      tags JSONB DEFAULT '[]',
      mechanical TEXT DEFAULT '',
      cosmetic TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  // Add mmr column if it doesn't exist yet (migration)
  await pool.query(`ALTER TABLE cars ADD COLUMN IF NOT EXISTS mmr TEXT DEFAULT ''`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recon_months (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS recon_stocks (
      id TEXT PRIMARY KEY,
      month_id TEXT NOT NULL REFERENCES recon_months(id) ON DELETE CASCADE,
      lot TEXT NOT NULL,
      stock_number TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log('Database ready')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapCar(c) {
  return {
    id: c.id,
    run: c.run || '',
    lane: c.lane || '',
    year: c.year || '',
    make: c.make || '',
    model: c.model || '',
    color: c.color || '',
    miles: c.miles || '',
    maxBid: c.max_bid || '',
    mmr: c.mmr || '',
    interest: c.interest || 'maybe',
    tags: c.tags || [],
    mechanical: c.mechanical || '',
    cosmetic: c.cosmetic || '',
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/visits', async (req, res) => {
  try {
    const { rows: visits } = await pool.query('SELECT * FROM visits ORDER BY created_at ASC')
    const { rows: cars } = await pool.query('SELECT * FROM cars ORDER BY created_at ASC')
    const result = visits.map(v => ({
      id: v.id,
      name: v.name,
      date: v.date || '',
      location: v.location || '',
      cars: cars.filter(c => c.visit_id === v.id).map(mapCar),
    }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/visits', async (req, res) => {
  try {
    const { id, name, date, location } = req.body
    // ON CONFLICT: clients retry queued saves after network failures, so a
    // request that already landed must succeed instead of erroring
    await pool.query(
      'INSERT INTO visits (id, name, date, location) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [id, name, date || null, location || null]
    )
    res.json({ id, name, date: date || '', location: location || '', cars: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/visits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM visits WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/visits/:visitId/cars', async (req, res) => {
  try {
    const { id, run, lane, year, make, model, color, miles, maxBid, mmr, interest, tags, mechanical, cosmetic } = req.body
    await pool.query(
      `INSERT INTO cars (id, visit_id, run, lane, year, make, model, color, miles, max_bid, mmr, interest, tags, mechanical, cosmetic)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO NOTHING`,
      [id, req.params.visitId, run, lane, year, make, model, color, miles, maxBid, mmr, interest, JSON.stringify(tags || []), mechanical, cosmetic]
    )
    res.json(req.body)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/visits/:visitId/cars/:carId', async (req, res) => {
  try {
    const { run, lane, year, make, model, color, miles, maxBid, mmr, interest, tags, mechanical, cosmetic } = req.body
    await pool.query(
      `UPDATE cars SET run=$1, lane=$2, year=$3, make=$4, model=$5, color=$6, miles=$7,
       max_bid=$8, mmr=$9, interest=$10, tags=$11, mechanical=$12, cosmetic=$13
       WHERE id=$14 AND visit_id=$15`,
      [run, lane, year, make, model, color, miles, maxBid, mmr, interest, JSON.stringify(tags || []), mechanical, cosmetic, req.params.carId, req.params.visitId]
    )
    res.json(req.body)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/visits/:visitId/cars/:carId', async (req, res) => {
  try {
    await pool.query('DELETE FROM cars WHERE id = $1 AND visit_id = $2', [req.params.carId, req.params.visitId])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ─── Reconciliation Routes ─────────────────────────────────────────────────────

app.get('/api/recon', async (req, res) => {
  try {
    const { rows: months } = await pool.query('SELECT * FROM recon_months ORDER BY created_at DESC')
    const { rows: stocks } = await pool.query('SELECT * FROM recon_stocks ORDER BY created_at ASC')
    const result = months.map(m => ({
      id: m.id,
      month: m.month,
      stocks: stocks.filter(s => s.month_id === m.id).map(s => ({
        id: s.id, lot: s.lot, stock_number: s.stock_number,
      })),
    }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/recon', async (req, res) => {
  try {
    const { id, month } = req.body
    await pool.query('INSERT INTO recon_months (id, month) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [id, month])
    res.json({ id, month, stocks: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/recon/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM recon_months WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/recon/:monthId/stocks', async (req, res) => {
  try {
    const { id, lot, stock_number } = req.body
    await pool.query(
      'INSERT INTO recon_stocks (id, month_id, lot, stock_number) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [id, req.params.monthId, lot, stock_number]
    )
    res.json({ id, lot, stock_number })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/recon/:monthId/stocks/:stockId', async (req, res) => {
  try {
    await pool.query('DELETE FROM recon_stocks WHERE id = $1 AND month_id = $2', [req.params.stockId, req.params.monthId])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})
