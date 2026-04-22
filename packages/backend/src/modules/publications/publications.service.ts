import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';

// ─── Transliteration map (Russian → Latin) ────────────────────────────────────

const TRANSLIT_MAP: Record<string, string> = {
  а: 'a',  б: 'b',  в: 'v',  г: 'g',  д: 'd',
  е: 'e',  ё: 'yo', ж: 'zh', з: 'z',  и: 'i',
  й: 'y',  к: 'k',  л: 'l',  м: 'm',  н: 'n',
  о: 'o',  п: 'p',  р: 'r',  с: 's',  т: 't',
  у: 'u',  ф: 'f',  х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ъ: '', ы: 'y',  ь: '',
  э: 'e',  ю: 'yu', я: 'ya',
};

/**
 * Convert a Russian (or mixed) string to a URL-safe kebab-case slug.
 *
 * Steps:
 * 1. Lowercase the source string.
 * 2. Replace each Cyrillic character using the transliteration map.
 * 3. Replace spaces and any remaining non-alphanumeric characters with hyphens.
 * 4. Collapse consecutive hyphens and trim leading/trailing hyphens.
 */
function transliterateToSlug(text: string): string {
  const lower = text.toLowerCase();

  const latin = lower
    .split('')
    .map((char) => (TRANSLIT_MAP[char] !== undefined ? TRANSLIT_MAP[char] : char))
    .join('');

  return latin
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric → hyphen
    .replace(/-{2,}/g, '-')       // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '');     // trim leading/trailing hyphens
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new publication for the given author.
   * If `dto.slug` is omitted the slug is auto-generated from `dto.name`.
   */
  async create(authorId: string, dto: CreatePublicationDto) {
    const slug = dto.slug ?? transliterateToSlug(dto.name);

    if (!slug) {
      throw new ConflictException(
        'Could not generate a valid slug from the provided name',
      );
    }

    const existing = await this.prisma.publication.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Slug "${slug}" is already taken`);
    }

    return this.prisma.publication.create({
      data: {
        author_id: authorId,
        name: dto.name,
        slug,
        description: dto.description,
      },
    });
  }

  /**
   * Find a publication by its slug (public endpoint).
   * Returns the record together with the total subscriber count.
   */
  async findBySlug(slug: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!publication) {
      throw new NotFoundException(`Publication with slug "${slug}" not found`);
    }

    return publication;
  }

  /**
   * Return all publications owned by a specific author.
   */
  async findByAuthorId(authorId: string) {
    return this.prisma.publication.findMany({
      where: { author_id: authorId },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Update a publication.  Only the owner may perform this action.
   */
  async update(id: string, authorId: string, dto: UpdatePublicationDto) {
    const publication = await this.findOwnedOrThrow(id, authorId);

    // If a new slug is requested, verify uniqueness
    if (dto.slug && dto.slug !== publication.slug) {
      const existing = await this.prisma.publication.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" is already taken`);
      }
    }

    return this.prisma.publication.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.paid_enabled !== undefined && { paid_enabled: dto.paid_enabled }),
        ...(dto.paid_price_monthly !== undefined && {
          paid_price_monthly: dto.paid_price_monthly,
        }),
      },
    });
  }

  /**
   * Enable paid subscriptions for a publication.
   * Only the owner may perform this action.
   */
  async enablePaidTier(id: string, authorId: string, priceMonthly: number) {
    await this.findOwnedOrThrow(id, authorId);

    return this.prisma.publication.update({
      where: { id },
      data: {
        paid_enabled: true,
        paid_price_monthly: priceMonthly,
      },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async findOwnedOrThrow(id: string, authorId: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { id },
    });

    if (!publication) {
      throw new NotFoundException(`Publication "${id}" not found`);
    }

    if (publication.author_id !== authorId) {
      throw new ForbiddenException(
        'You do not have permission to modify this publication',
      );
    }

    return publication;
  }
}
