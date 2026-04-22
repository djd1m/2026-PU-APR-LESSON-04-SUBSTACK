import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a route or controller.
 *
 * @example
 * @Roles(UserRole.admin)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('admin/stats')
 * getStats() {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
