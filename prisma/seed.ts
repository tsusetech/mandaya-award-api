import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create your specific roles
  const pesertaRole = await prisma.role.upsert({
    where: { name: 'PESERTA' },
    update: {},
    create: {
      name: 'PESERTA',
      description: 'Peserta kompetisi',
    },
  });

  const juriRole = await prisma.role.upsert({
    where: { name: 'JURI' },
    update: {},
    create: {
      name: 'JURI',
      description: 'Juri penilaian kompetisi',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator sistem',
    },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPERADMIN' },
    update: {},
    create: {
      name: 'SUPERADMIN',
      description: 'Super Administrator dengan akses penuh',
    },
  });

  console.log({ pesertaRole, juriRole, adminRole, superAdminRole });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });