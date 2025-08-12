// backend/authz.js
/**
 * Authorization helpers (RBAC / ownership)
 * ใช้คู่กับ authMiddleware (ต้องมี req.user มาก่อน)
 */

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.sendStatus(401);
    if (!roles.includes(req.user.role)) return res.sendStatus(403);
    next();
  };
}

/**
 * ตรวจว่าเป็นเจ้าของ resource หรือเป็น ADMIN
 * checker: async (req) => boolean  // return true ถ้าอนุญาต
 */
function requireOwnershipOrAdmin(checker) {
  return async (req, res, next) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role === 'ADMIN') return next();
    try {
      const ok = await checker(req);
      if (!ok) return res.sendStatus(403);
      next();
    } catch (e) {
      return res.status(500).json({ error: 'Ownership check failed' });
    }
  };
}

module.exports = { requireRole, requireOwnershipOrAdmin };
