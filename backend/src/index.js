const express = require('express')
const cors    = require('cors')
const seed    = require('./db/seed')

const app  = express()
const PORT = process.env.PORT || 3001

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : true,
  credentials: true,
}))
app.use(express.json())

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'))
app.use('/api/inventory',    require('./routes/inventory'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/dashboard',    require('./routes/dashboard'))
app.use('/api/export',       require('./routes/export'))

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }))

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────────
async function start() {
  console.log('Running database seed...')
  await seed()

  app.listen(PORT, () => {
    console.log(`StockPilot backend running on port ${PORT}`)
  })
}

start().catch(err => {
  console.error('Startup failed:', err)
  process.exit(1)
})
