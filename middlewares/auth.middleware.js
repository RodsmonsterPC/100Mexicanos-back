const jwt = require('jsonwebtoken');

exports.requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No autorizado: Falta token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'No autorizado: Token inválido' });
  }
};

exports.requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No autorizado: Falta token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    if (decoded.isAdmin) {
      req.adminUser = decoded.username;
      next();
    } else {
      return res.status(403).json({ message: 'No autorizado: Se requieren privilegios de administrador' });
    }
  } catch (error) {
    res.status(401).json({ message: 'No autorizado: Token inválido' });
  }
};
