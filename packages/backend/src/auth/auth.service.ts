import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

const BCRYPT_ROUNDS = 12;

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  email_verified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory store for refresh tokens (use Redis in production via Bull/cache)
  private readonly refreshTokens = new Map<string, string>();

  // Email verification tokens (token → userId)
  private readonly verificationTokens = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<TokenPair & { user: UserProfile }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const verificationToken = uuidv4();

    let user: { id: string; email: string; name: string; role: UserRole; avatar_url: string | null; email_verified: boolean };
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          password_hash: passwordHash,
          name: dto.name,
          role: UserRole.author,
          email_verified: false,
        },
        select: { id: true, email: true, name: true, role: true, avatar_url: true, email_verified: true },
      });
    } catch (err) {
      this.logger.error('Failed to create user', err);
      throw new InternalServerErrorException('Failed to create user account');
    }

    // Store verification token
    this.verificationTokens.set(verificationToken, user.id);

    // Send verification email (fire-and-forget — errors are logged)
    this.sendVerificationEmail(user.email, verificationToken).catch((err) =>
      this.logger.error('Failed to send verification email', err),
    );

    // Auto-login after registration
    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    this.logger.log(`User registered and logged in: ${user.email} (${user.id})`);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified,
      },
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<TokenPair & { user: UserProfile }> {
    const user = await this.validateUser(dto.email, dto.password);
    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    this.logger.log(`User logged in: ${user.email}`);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified,
      },
    };
  }

  // ─── Validate User ────────────────────────────────────────────────────────────

  async validateUser(
    email: string,
    password: string,
  ): Promise<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar_url: string | null;
    email_verified: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password_hash: true,
        name: true,
        role: true,
        avatar_url: true,
        email_verified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      email_verified: user.email_verified,
    };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  async refreshToken(
    refreshToken: string,
  ): Promise<TokenPair & { user: UserProfile }> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret:
          this.configService.get<string>('jwtRefreshSecret') ??
          'change-refresh-me',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check stored refresh token (validate rotation)
    const storedToken = this.refreshTokens.get(payload.sub);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException(
        'Refresh token has been revoked or rotated',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar_url: true,
        email_verified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    this.logger.log(`Tokens refreshed for user: ${user.email}`);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified,
      },
    };
  }

  // ─── Email Verification ───────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<{ message: string }> {
    const userId = this.verificationTokens.get(token);
    if (!userId) {
      throw new BadRequestException(
        'Verification token is invalid or has expired',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { email_verified: true },
    });

    this.verificationTokens.delete(token);
    this.logger.log(`Email verified for user: ${userId}`);
    return { message: 'Email verified successfully' };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async generateTokenPair(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwtSecret') ?? 'change-me',
        expiresIn:
          this.configService.get<string>('jwtExpiresIn') ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwtRefreshSecret') ??
          'change-refresh-me',
        expiresIn:
          this.configService.get<string>('jwtRefreshExpiresIn') ?? '30d',
      }),
    ]);

    // Rotate: store the latest refresh token for this user
    this.refreshTokens.set(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  private async sendVerificationEmail(
    email: string,
    token: string,
  ): Promise<void> {
    const baseUrl =
      this.configService.get<string>('app.baseUrl') ?? 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/auth/verify/${token}`;

    this.logger.log(
      `[DEV] Verification link for ${email}: ${verifyUrl}`,
    );

    // In production: use Resend (EmailModule) to send the actual email.
    // Keeping this stub here to avoid circular dependency with EmailModule.
    // The EmailModule's service can be injected when needed.
  }
}
