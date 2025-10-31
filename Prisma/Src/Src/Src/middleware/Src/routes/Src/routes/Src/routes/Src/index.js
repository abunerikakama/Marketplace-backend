const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const paymentsRoutes = require('./routes/payments');
const prisma = require('./prismaClient');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static uploads folder (for MVP local dev)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// routes
app.use('/auth', authRoutes);
app.use('/items', itemsRoutes);
app.use('/payments', paymentsRoutes);

// health
app.get('/', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down — closing prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

const port = config.port;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
