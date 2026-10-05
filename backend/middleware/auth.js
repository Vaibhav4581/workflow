const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests using JWT.
 * Expects header format: Authorization: Bearer <TOKEN>
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied: No authorization token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'pineapplepie', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Access denied: Token is invalid or has expired.' });
    }
    req.user = user;
    next();
  });
};

/**
 * Optional helper middleware to restrict endpoints to specific roles.
 * @param  {...string} allowedRoles - Role names (e.g. 'admin', 'principal')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Forbidden: User role not defined in token.' });
    }
    const userRole = req.user.role.toLowerCase().replace(/[\s\-_]/g, '');
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().replace(/[\s\-_]/g, ''));
    
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges for this resource.' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
