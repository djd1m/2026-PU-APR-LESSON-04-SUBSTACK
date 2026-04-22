/**
 * Prisma seed script for SubStack RU
 * Run: npm run prisma:seed
 *
 * Seeds:
 *  - 1 admin user
 *  - 1 author user with a publication
 *  - 1 reader user with a free subscription
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  console.log('Seeding database...');

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('AdminPass123!', BCRYPT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@substackru.com' },
    update: {},
    create: {
      email: 'admin@substackru.com',
      password_hash: adminHash,
      name: 'Platform Admin',
      role: UserRole.admin,
      email_verified: true,
    },
  });
  console.log(`Admin: ${admin.email} (${admin.id})`);

  // ── Author ─────────────────────────────────────────────────────────────────
  const authorHash = await bcrypt.hash('AuthorPass123!', BCRYPT_ROUNDS);
  const author = await prisma.user.upsert({
    where: { email: 'author@example.com' },
    update: {},
    create: {
      email: 'author@example.com',
      password_hash: authorHash,
      name: 'Иван Автор',
      role: UserRole.author,
      email_verified: true,
    },
  });
  console.log(`Author: ${author.email} (${author.id})`);

  // ── Publication ────────────────────────────────────────────────────────────
  const publication = await prisma.publication.upsert({
    where: { slug: 'ivan-notes' },
    update: {},
    create: {
      author_id: author.id,
      name: 'Заметки Ивана',
      slug: 'ivan-notes',
      description: 'Мысли о технологиях, стартапах и жизни в России.',
      paid_enabled: true,
      paid_price_monthly: 50000, // 500 RUB in kopecks
      paid_price_yearly: 500000, // 5000 RUB in kopecks
    },
  });
  console.log(`Publication: ${publication.slug} (${publication.id})`);

  // ── Sample Article ─────────────────────────────────────────────────────────
  await prisma.article.upsert({
    where: { publication_id_slug: { publication_id: publication.id, slug: 'welcome' } },
    update: {},
    create: {
      publication_id: publication.id,
      title: 'Добро пожаловать!',
      slug: 'welcome',
      content_markdown: '# Добро пожаловать!\n\nЭто первая статья блога.',
      content_html: '<h1>Добро пожаловать!</h1><p>Это первая статья блога.</p>',
      excerpt: 'Это первая статья блога.',
      visibility: 'free',
      status: 'published',
      published_at: new Date(),
    },
  });

  // ── Reader ─────────────────────────────────────────────────────────────────
  const readerHash = await bcrypt.hash('ReaderPass123!', BCRYPT_ROUNDS);
  const reader = await prisma.user.upsert({
    where: { email: 'reader@example.com' },
    update: {},
    create: {
      email: 'reader@example.com',
      password_hash: readerHash,
      name: 'Мария Читатель',
      role: UserRole.reader,
      email_verified: true,
    },
  });
  console.log(`Reader: ${reader.email} (${reader.id})`);

  // ── Free Subscription ──────────────────────────────────────────────────────
  const existing = await prisma.subscription.findFirst({
    where: { subscriber_id: reader.id, publication_id: publication.id },
  });

  if (!existing) {
    await prisma.subscription.create({
      data: {
        subscriber_id: reader.id,
        publication_id: publication.id,
        type: 'free',
        status: 'active',
        started_at: new Date(),
      },
    });
    console.log(`Free subscription created for ${reader.email}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
