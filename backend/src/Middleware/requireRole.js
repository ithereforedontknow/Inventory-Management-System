/**
 * Role hierarchy: admin > manager > viewer
 * Usage: router.post("/", requireRole("manager"), handler)
 * This allows the given role AND any role above it.
 */
const ROLE_LEVEL = { viewer: 1, manager: 2, admin: 3 };

function requireRole(minRole) {
  return (req, res, next) => {
    const userLevel = ROLE_LEVEL[req.user?.role] ?? 0;
    const required = ROLE_LEVEL[minRole] ?? 99;
    if (userLevel < required) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { requireRole };
