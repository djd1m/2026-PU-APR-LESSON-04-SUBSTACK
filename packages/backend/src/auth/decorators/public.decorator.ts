import { SetMetadata } from '@nestjs/common';

/**
 * Key used to mark a route handler or controller as publicly accessible
 * (no JWT authentication required).
 * Consumed by JwtAuthGuard via Reflector.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as public — bypasses JWT authentication.
 *
 * @example
 * @Public()
 * @Post('register')
 * register(@Body() dto: RegisterDto) {}
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
