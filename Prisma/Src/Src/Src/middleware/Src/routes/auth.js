const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const config = require('../config');

const router = express.Router();

/**
 * POST /auth/signup
 * body: { name, email, password, phone }
 */
router.post('/signup', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, phone }
    });
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /auth/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
