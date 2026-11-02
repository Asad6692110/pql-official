// Seed a single pre-made login account so you don't have to go through the
// signup/OTP flow for your own testing. Run with:  node backend/prisma/seedTestUser.js
// Change EMAIL / PASSWORD below (or pass them as env vars) before running.
// The password is stored bcrypt-hashed, exactly like every other account.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const EMAIL = process.env.SEED_EMAIL || 'samiu2636@gmail.com';
const PASSWORD = process.env.SEED_PASSWORD || 'Sami12345@';

function genCode(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

function genWalletAddress(network, userId) {
  const seed = userId.substring(0, 8);
  if (network === 'TRC20') return 'T' + Buffer.from(seed + 'trc').toString('hex').substring(0, 33).toUpperCase();
  if (network === 'ERC20') return '0x' + Buffer.from(seed + 'erc').toString('hex').substring(0, 40);
  if (network === 'BEP20') return '0x' + Buffer.from(seed + 'bep').toString('hex').substring(0, 40);
  if (network === 'BTC') return '1' + Buffer.from(seed + 'btc').toString('hex').substring(0, 33);
  return seed;
}

async function main() {
  const hashed = await bcrypt.hash(PASSWORD, 10);

  // Upsert: create the account if missing, or just reset its password if it
  // already exists. Safe to run more than once.
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existing) {
    await prisma.user.update({
      where: { email: EMAIL },
      data: { password: hashed, isVerified: true },
    });
    console.log(`Updated existing account ${EMAIL} (password reset).`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password: hashed,
      referralCode: genCode(8),
      isVerified: true,
    },
  });

  await prisma.walletAddress.createMany({
    data: ['TRC20', 'ERC20', 'BEP20', 'BTC'].map((network) => ({
      userId: user.id,
      network,
      address: genWalletAddress(network, user.id),
    })),
  });

  console.log(`Created account:`);
  console.log(`  email:    ${EMAIL}`);
  console.log(`  password: ${PASSWORD}`);
  console.log(`  id:       ${user.id}`);
  console.log(`  referral: ${user.referralCode}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
