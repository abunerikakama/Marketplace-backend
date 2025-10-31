const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

/**
 * GET /items
 * query: ?q=&category=&city=&boostedOnly=true
 */
router.get('/', async (req, res) => {
  const { q, category, city, boostedOnly } = req.query;
  const where = { status: 'active' };

  if (category) where.category = category;
  if (city) where.city = city;
  if (boostedOnly === 'true') where.boosted = true;

  if (q) {
    // basic text search: title or description contains q (case-insensitive)
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } }
    ];
  }

  try {
    const items = await prisma.item.findMany({
      where,
      orderBy: [
        { boosted: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /items/:id
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });

    // increment view count (best as background job; ok for MVP)
    await prisma.item.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /items
 * auth required
 * multipart form for photos (optional)
 */
router.post('/', auth, upload.array('photos', 6), async (req, res) => {
  const { title, description, category, condition, price, currency, city, region, lat, lng } = req.body;
  const photos = (req.files || []).map(f => `/uploads/${f.filename}`); // simple local path for MVP
  try {
    const item = await prisma.item.create({
      data: {
        sellerId: req.user.id,
        title,
        description,
        category,
        condition,
        price: parseInt(price || 0),
        currency: currency || 'UGX',
        photos,
        city,
        region,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null
      }
    });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /items/:id
 * auth required - only seller or admin
 */
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.sellerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const data = req.body;
    if (data.price) data.price = parseInt(data.price);

    const updated = await prisma.item.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /items/:id
 * soft-delete by marking status = removed
 */
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.sellerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    await prisma.item.update({ where: { id }, data: { status: 'removed' } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
