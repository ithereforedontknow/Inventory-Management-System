const pool = require("../db/pool");

/**
 * Write one row to audit_log.
 *
 * @param {object} user        - req.user ({ id, username })
 * @param {'CREATE'|'UPDATE'|'DELETE'} action
 * @param {'inventory'|'transaction'} entity
 * @param {number} entityId
 * @param {string} entityLabel - human-readable: item name, tx description, etc.
 * @param {object|null} changes - for UPDATE: { field: [oldVal, newVal] }
 */
async function auditLog(
  user,
  action,
  entity,
  entityId,
  entityLabel,
  changes = null,
) {
  try {
    await pool.execute(
      `INSERT INTO audit_log (user_id, username, action, entity, entity_id, entity_label, changes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        action,
        entity,
        entityId,
        entityLabel,
        changes ? JSON.stringify(changes) : null,
      ],
    );
  } catch (err) {
    // Never let audit failure break the main request
    console.error("Audit log error:", err);
  }
}

module.exports = { auditLog };
