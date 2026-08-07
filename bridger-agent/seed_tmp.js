const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const client = await prisma.client.create({ data: { name: 'Test Client' } });
  const account = await prisma.account.create({ data: { name: 'Test Account', clientId: client.id } });
  const vendor = await prisma.vendor.create({ data: { name: 'Existing Vendor', clientId: client.id } });
  const t1 = await prisma.transaction.create({
    data: {
      clientId: client.id,
      accountId: account.id,
      date: new Date(),
      totalAmount: 100,
      status: 'needs_review',
      confidence: 0.9,
    },
  });
  const t2 = await prisma.transaction.create({
    data: {
      clientId: client.id,
      accountId: account.id,
      date: new Date(),
      totalAmount: -100,
      status: 'needs_review',
      confidence: 0.9,
    },
  });
  console.log(JSON.stringify({ clientId: client.id, t1: t1.id, t2: t2.id, vendorId: vendor.id }));
})().finally(() => prisma.$disconnect());
