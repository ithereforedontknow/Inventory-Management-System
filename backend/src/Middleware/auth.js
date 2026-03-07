const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'changeme-use-a-real-secret'

function signToken(payload) {
  const hours = parseInt(process.env.JWT_EXPIRY_HOURS || '8')
  return jwt.sign(payload, SECRET, { expiresIn: `${hours}h` })
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const token = header.slice(7)
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { signToken, requireAuth }
