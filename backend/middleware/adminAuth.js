const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'asly_admin_session';

function requireAdmin(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: 'يرجى تسجيل الدخول للمتابعة' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.sub !== 'admin') {
      return res.status(401).json({ message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
    }
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
  }
}

module.exports = { COOKIE_NAME, requireAdmin };