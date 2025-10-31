const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

/**
 * POST /payments/checkout
 * body: { itemId, boostType }
 * Creates a Boost record and returns a payment url (stub)
 */
router.post('/checkout', auth, async (req, res) => {
  const { itemId, boostType } = req.body;
  if (!itemId || !boostType) return res.status(400).json({ error: 'Missing params' });

  // simple pricing rules (example)
  const pricing = {
    'top_24h': 3000,
    'featured_7d': 10000
  };
  const amount = pricing[boostType] || 3000;

  try {
    const boost = await prisma.boost.create({
      data: {
        itemId,
        sellerId: req.user.id,
        boostType,
        amount,
        currency: 'UGX',
        status: 'pending'
      }
    });

    // TODO: integrate with Flutterwave/Paystack to create a payment link / checkout session
    // For now return a fake payment URL which your client will open
    const fakePaymentUrl = `${config.appBaseUrl}/payments/fake-checkout?boostId=${boost.id}`;
    res.json({ boost, paymentUrl: fakePaymentUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /payments/webhook/flutterwave
 * implement provider webhook verification and mark boost paid
 */
router.post('/webhook/flutterwave', express.json(), async (req, res) => {
  // TODO: verify signature using FLUTTERWAVE_SECRET
  const payload = req.body;
  console.log('Received flutterwave webhook:', payload);

  // Example: find boost by paymentReference and mark paid
  // const paymentRef = payload.data.tx_ref;
  // await prisma.paymentLog.create({...});
  // update boost and item.boostedUntil accordingly

  res.json({ received: true });
});

/**
 * GET /payments/fake-checkout
 * (dev helper) simulate a successful payment for testing
 */
router.get('/fake-checkout', async (req, res) => {
  const { boostId } = req.query;
  if (!boostId) return res.status(400).send('boostId required');
  // mark boost as paid and set boostedUntil to now + 24 hours (for top_24h)
  const boost = await prisma.boost.findUnique({ where: { id: boostId } });
  if (!boost) return res.status(404).send('boost not found');

  const now = new Date();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.boost.update({ where: { id: boostId }, data: { status: 'paid', paymentReference: 'FAKE-'+boostId, startsAt: now, endsAt } });

  // update item
  await prisma.item.update({ where: { id: boost.itemId }, data: { boosted: true, boostedUntil: endsAt } });

  res.send('Fake payment applied: boost activated for 24 hours');
});

module.exports = router;
