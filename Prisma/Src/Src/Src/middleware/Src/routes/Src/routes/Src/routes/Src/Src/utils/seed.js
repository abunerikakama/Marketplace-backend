const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice Seller',
      email: 'alice@example.com',
      password
    }
  });

  await prisma.item.createMany({
    data: [
      {
        sellerId: alice.id,
        title: 'Used iPhone 11 - Good Condition',
        description: 'Phone with minor scratches, 64GB, working perfectly.',
        category: 'electronics',
        condition: 'used-good',
        price: 4000000,
        currency: 'UGX',
        photos: []
      },
      {
        sellerId: alice.id,
        title: 'Office Desk - Wooden',
        description: 'Solid wooden desk, 150x70cm. Slight wear.',
        category: 'furniture',
        condition: 'used-good',
        price: 2500000,
        currency: 'UGX',
        photos: []
      }
    ]
  });

  console.log('Seed complete');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
