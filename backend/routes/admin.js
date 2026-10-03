const crypto = require('node:crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Order, ORDER_STATUSES } = require('../models/Order');
const { COOKIE_NAME, requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'محاولات كثيرة، يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً' },
});

function safeEqual(candidate, expected) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const validUsername = typeof username === 'string' && safeEqual(username, process.env.ADMIN_USERNAME);
  const validPassword = typeof password === 'string' && safeEqual(password, process.env.ADMIN_PASSWORD);

  if (!validUsername || !validPassword) {
    return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const token = jwt.sign({ sub: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return res.json({ message: 'تم تسجيل الدخول بنجاح' });
});

router.post('/logout', requireAdmin, (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  return res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

router.get('/session', requireAdmin, (req, res) => {
  return res.json({ authenticated: true });
});

router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'حالة الطلب غير صحيحة' });
    }

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { phone: pattern }, { coffeeType: pattern }];
    }

    const [orders, total, allTotal, groupedCounts] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
      Order.countDocuments({}),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const stats = { total: allTotal, ...Object.fromEntries(ORDER_STATUSES.map((key) => [key, 0])) };
    for (const item of groupedCounts) {
      if (Object.hasOwn(stats, item._id)) stats[item._id] = item.count;
    }

    return res.json({
      message: 'تم تحميل الطلبات بنجاح',
      orders,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return res.status(500).json({ message: 'تعذر تحميل الطلبات حالياً، يرجى المحاولة لاحقاً' });
  }
});

router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'رقم الطلب غير صحيح' });
    }
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'حالة الطلب غير مسموح بها' });
    }

    const order = await Order.findByIdAndUpdate(id, { $set: { status } }, { new: true, runValidators: true }).lean();
    if (!order) return res.status(404).json({ message: 'لم يتم العثور على الطلب' });
    return res.json({ message: 'تم تحديث حالة الطلب بنجاح', order });
  } catch {
    return res.status(500).json({ message: 'تعذر تحديث الطلب حالياً، يرجى المحاولة لاحقاً' });
  }
});

module.exports = router;