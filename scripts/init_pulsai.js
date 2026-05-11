const { PrismaClient } = require('../src/generated/client');

const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const username = 'PulsAI';
  const email = 'pulsai@internal.system';
  const hashedPassword = await bcrypt.hash('pulsai_secure_password_123_abc', 12);

  const user = await prisma.user.upsert({
    where: { username: username },
    update: {
      isVerified: true,
      verificationType: 'GOLD',
      accountLabel: 'BOT',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PulsAI',
      bio: 'IA Oficial de Pulso. Asistente de investigación lógico e imparcial. Mencióname para obtener ayuda o análisis.'
    },

    create: {
      name: 'PulsAI',
      username: username,
      email: email,
      password: hashedPassword,
      isVerified: true,
      verificationType: 'GOLD',
      accountLabel: 'BOT',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PulsAI',
      bio: 'IA Oficial de Pulso. Asistente de investigación lógico e imparcial. Mencióname para obtener ayuda o análisis.',
      emailVerified: new Date()
    }

  });

  console.log("PulsAI Bot User Ready:", user.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
