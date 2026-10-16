import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import {
  TenantListItem,
  TenantQueryDTO,
  SuggestTenantCredentialsResponse,
  CreateTenantDTO,
  CreatedTenantResponse,
  TenantStatus,
} from '../types/admin.types.js';

export class AdminService {
  /**
   * Helper to format a clean title-cased alphanumeric word from text (gym name, city, owner)
   */
  static sanitizeBaseWord(text: string, minLength = 4, defaultFallback = 'Twelvo'): string {
    const cleaned = (text || '').replace(/[^a-zA-Z0-9]/g, '');
    if (!cleaned) return defaultFallback;
    // Capitalize first letter, keep remainder lowercase for clean readability
    let formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    if (formatted.length < minLength) {
      formatted = (formatted + 'Gym').slice(0, Math.max(minLength, 4));
    }
    return formatted;
  }

  /**
   * Validates password strength according to SaaS security criteria:
   * - At least 8 characters long
   * - Contains at least one uppercase letter (A-Z)
   * - Contains at least one lowercase letter (a-z)
   * - Contains at least one digit (0-9)
   * - Contains at least one special symbol (@, !, #, etc.)
   */
  static validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password is required.' };
    }
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number.' };
    }
    if (!/[@$!%*?&#^_\-.]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character (e.g. @).' };
    }
    return { isValid: true };
  }

  /**
   * Suggests unique tenant prefix, username, and an intelligent strong password
   * Algorithm:
   * - Derives base from gym name (e.g. "newgymfit" -> "Newgymfit@1234")
   * - If gym name or prefix already exists in database, falls back to their city name (e.g. "Bengaluru@1234"),
   *   or owner name (e.g. "Paul@1234")
   * - Strictly validates generated password to guarantee compliance
   */
  static async suggestTenantCredentials(
    gymName: string,
    city?: string,
    ownerName?: string,
    randomizeDigits = false
  ): Promise<SuggestTenantCredentialsResponse> {
    const cleanName = (gymName || '').trim();
    const cleanCity = (city || '').trim();
    const cleanOwner = (ownerName || '').trim();

    // 1. Derive base prefix from first 2 alphanumeric letters
    const alphaOnly = cleanName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let basePrefix = alphaOnly.slice(0, 2);
    if (basePrefix.length < 2) {
      basePrefix = (basePrefix + 'GM').slice(0, 2);
    }

    // 2. Find unique tenant prefix (check against tenants.tenant_prefix)
    let candidatePrefix = basePrefix;
    let prefixCounter = 1;

    while (true) {
      const existing = await prisma.tenant.findFirst({
        where: {
          tenantPrefix: { equals: candidatePrefix, mode: 'insensitive' },
        },
      });

      if (!existing) {
        break;
      }
      candidatePrefix = `${basePrefix}${prefixCounter}`;
      prefixCounter++;
    }

    // 3. Find unique username (${prefix.toLowerCase()}admin)
    const baseUsername = `${candidatePrefix.toLowerCase()}admin`;
    let candidateUsername = baseUsername;
    let userCounter = 1;

    while (true) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: { equals: candidateUsername, mode: 'insensitive' },
        },
      });

      if (!existingUser) {
        break;
      }
      candidateUsername = `${baseUsername}${userCounter}`;
      userCounter++;
    }

    // 4. Unique Password Generation Algorithm
    // Check if a gym with this name already exists in the database
    const existingGymByName = cleanName
      ? await prisma.tenant.findFirst({
          where: { gymName: { equals: cleanName, mode: 'insensitive' } },
        })
      : null;

    const hasCollision = Boolean(existingGymByName) || prefixCounter > 1;

    let baseWord: string;
    if (hasCollision && cleanCity) {
      // Gym already exists / collision: use their city name (e.g. Bengaluru@1234)
      baseWord = this.sanitizeBaseWord(cleanCity, 4, 'City');
    } else if (hasCollision && cleanOwner) {
      // City empty, use owner name (e.g. Paul@1234)
      const ownerFirst = cleanOwner.split(/\s+/)[0];
      baseWord = this.sanitizeBaseWord(ownerFirst, 4, 'Owner');
    } else if (cleanName) {
      // Fresh gym: use gym name
      const singleWord = cleanName.replace(/[^a-zA-Z0-9]/g, '');
      if (singleWord.length <= 14) {
        baseWord = this.sanitizeBaseWord(singleWord, 4, 'Twelvo');
      } else {
        const firstWord = cleanName.split(/\s+/)[0];
        baseWord = this.sanitizeBaseWord(firstWord, 4, 'Twelvo');
      }
    } else if (cleanCity) {
      baseWord = this.sanitizeBaseWord(cleanCity, 4, 'City');
    } else if (cleanOwner) {
      baseWord = this.sanitizeBaseWord(cleanOwner.split(/\s+/)[0], 4, 'Owner');
    } else {
      baseWord = 'Twelvo';
    }

    // Append '@' and digits (default '1234' or random 4 digits if requested)
    const digits = randomizeDigits ? Math.floor(1000 + Math.random() * 9000).toString() : '1234';
    let strongPassword = `${baseWord}@${digits}`;

    // Guarantee password passes all strength validation checks
    const check = this.validatePasswordStrength(strongPassword);
    if (!check.isValid) {
      if (strongPassword.length < 8) {
        strongPassword = `${baseWord}Gym@${digits}`;
      }
      if (!/[A-Z]/.test(strongPassword)) {
        strongPassword = 'G' + strongPassword;
      }
      if (!/[0-9]/.test(strongPassword)) {
        strongPassword += '1234';
      }
      if (!/[@$!%*?&#^_\-.]/.test(strongPassword)) {
        strongPassword = `${strongPassword}@`;
      }
    }

    return {
      tenantPrefix: candidatePrefix,
      username: candidateUsername,
      password: strongPassword,
    };
  }

  /**
   * List all tenants across the platform (paginated, searchable, filtered)
   */
  static async getTenants(query: TenantQueryDTO = {}): Promise<{
    tenants: TenantListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (query.status && query.status.toUpperCase() !== 'ALL') {
      where.status = query.status.toLowerCase();
    }

    if (query.city && query.city.trim()) {
      where.city = { contains: query.city.trim(), mode: 'insensitive' };
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { gymName: { contains: term, mode: 'insensitive' } },
        { ownerName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phoneNumber: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { tenantCode: { contains: term, mode: 'insensitive' } },
        { tenantPrefix: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        include: {
          plan: {
            select: { planName: true },
          },
          _count: {
            select: {
              members: { where: { isDeleted: false } },
              users: { where: { isDeleted: false } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedTenants: TenantListItem[] = tenants.map((t) => ({
      tenantId: t.tenantId,
      tenantCode: t.tenantCode,
      tenantPrefix: t.tenantPrefix,
      gymName: t.gymName,
      ownerName: t.ownerName,
      email: t.email,
      phoneNumber: t.phoneNumber,
      addressLine: t.addressLine,
      city: t.city,
      state: t.state,
      country: t.country,
      pincode: t.pincode,
      gstNumber: t.gstNumber,
      logoUrl: t.logoUrl,
      status: t.status as TenantStatus,
      planId: t.planId,
      planName: t.plan?.planName || null,
      subscriptionStart: t.subscriptionStart ? t.subscriptionStart.toISOString().split('T')[0] : null,
      subscriptionEnd: t.subscriptionEnd ? t.subscriptionEnd.toISOString().split('T')[0] : null,
      membersCount: t._count.members,
      usersCount: t._count.users,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return {
      tenants: formattedTenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Creates a new tenant and gym_owner user atomically in a single DB transaction
   */
  static async createTenant(data: CreateTenantDTO): Promise<CreatedTenantResponse> {
    // 1. Validation
    if (!data.gymName || data.gymName.trim().length < 2) {
      const err = new Error('Gym name must be at least 2 characters.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email.trim())) {
      const err = new Error('A valid email address is required.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    if (data.phone && data.phone.trim().length < 7) {
      const err = new Error('Phone number must be at least 7 characters.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // 5-point password strength validation (8+ chars, uppercase, lowercase, numbers, symbol)
    const pwdStrength = this.validatePasswordStrength(data.password);
    if (!pwdStrength.isValid) {
      const err = new Error(pwdStrength.message || 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and a symbol (e.g. @).') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const cleanPrefix = (data.tenantPrefix || '').trim().toUpperCase();
    if (!cleanPrefix || cleanPrefix.length < 2 || cleanPrefix.length > 6) {
      const err = new Error('Tenant prefix must be between 2 and 6 characters.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = (data.username || '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      const err = new Error('Username must be at least 3 characters.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // 2. Uniqueness checks with clear 409 error responses
    const existingPrefix = await prisma.tenant.findFirst({
      where: { tenantPrefix: { equals: cleanPrefix, mode: 'insensitive' } },
    });
    if (existingPrefix) {
      const err = new Error(`Tenant prefix '${cleanPrefix}' is already in use by another gym. Please choose a different prefix.`) as Error & { statusCode?: number };
      err.statusCode = 409;
      throw err;
    }

    const existingUser = await prisma.user.findFirst({
      where: { username: { equals: cleanUsername, mode: 'insensitive' } },
    });
    if (existingUser) {
      const err = new Error(`Username '${cleanUsername}' is already taken. Please choose a different username.`) as Error & { statusCode?: number };
      err.statusCode = 409;
      throw err;
    }

    const existingTenantEmail = await prisma.tenant.findFirst({
      where: { email: { equals: data.email.trim(), mode: 'insensitive' } },
    });
    if (existingTenantEmail) {
      const err = new Error(`Email '${data.email.trim()}' is already registered with another gym.`) as Error & { statusCode?: number };
      err.statusCode = 409;
      throw err;
    }

    // 3. Hash password with bcrypt cost factor 12
    const passwordHash = await bcrypt.hash(data.password, 12);

    // 4. Run single DB transaction (never leave orphan tenant or orphan user)
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant with temporary unique code (must be <= 20 chars)
      const tempCode = `T${Date.now()}`;

      const createdTenant = await tx.tenant.create({
        data: {
          tenantCode: tempCode,
          tenantPrefix: cleanPrefix,
          gymName: data.gymName.trim(),
          ownerName: data.ownerName?.trim() || null,
          email: data.email.trim().toLowerCase(),
          phoneNumber: data.phone?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          gstNumber: data.gstNumber?.trim() || null,
          status: 'active',
        },
      });

      // Assign sequential tenant_code based on tenant_id: e.g. GYM0002
      const officialCode = `GYM${String(createdTenant.tenantId).padStart(4, '0')}`;
      const updatedTenant = await tx.tenant.update({
        where: { tenantId: createdTenant.tenantId },
        data: { tenantCode: officialCode },
      });

      // Insert gym_owner user account linked to the new tenant
      const createdUser = await tx.user.create({
        data: {
          tenantId: createdTenant.tenantId,
          username: cleanUsername,
          email: data.email.trim().toLowerCase(),
          phoneNumber: data.phone?.trim() || null,
          passwordHash,
          role: 'gym_owner',
          fullName: data.ownerName?.trim() || data.gymName.trim(),
          isActive: true,
        },
      });

      // Seed a default membership plan in plans_catalog for the new gym
      await tx.plansCatalog.create({
        data: {
          tenantId: createdTenant.tenantId,
          planName: 'Monthly General',
          planCategory: 'Regular',
          durationValue: 1,
          durationUnit: 'Months',
          standardFee: 2000.0,
          isActive: true,
        },
      });

      return {
        tenant: updatedTenant,
        user: createdUser,
      };
    });

    // Return created tenant + user (username only, never password hash!)
    return {
      tenant: {
        tenantId: result.tenant.tenantId,
        tenantCode: result.tenant.tenantCode,
        tenantPrefix: result.tenant.tenantPrefix || cleanPrefix,
        gymName: result.tenant.gymName,
        ownerName: result.tenant.ownerName,
        email: result.tenant.email,
        phoneNumber: result.tenant.phoneNumber,
        city: result.tenant.city,
        state: result.tenant.state,
        status: result.tenant.status,
        createdAt: result.tenant.createdAt.toISOString(),
      },
      user: {
        userId: result.user.userId.toString(),
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
        fullName: result.user.fullName,
      },
    };
  }

  /**
   * Toggles or updates tenant status between active and suspended
   */
  static async toggleTenantStatus(
    tenantId: number,
    targetStatus?: string
  ): Promise<TenantListItem> {
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
      include: {
        plan: { select: { planName: true } },
        _count: {
          select: {
            members: { where: { isDeleted: false } },
            users: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!tenant || tenant.isDeleted) {
      const err = new Error(`Tenant #${tenantId} not found.`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    let nextStatus = targetStatus ? targetStatus.toLowerCase() : '';
    if (!['active', 'suspended', 'trial', 'cancelled'].includes(nextStatus)) {
      nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    }

    const updated = await prisma.tenant.update({
      where: { tenantId },
      data: { status: nextStatus },
      include: {
        plan: { select: { planName: true } },
        _count: {
          select: {
            members: { where: { isDeleted: false } },
            users: { where: { isDeleted: false } },
          },
        },
      },
    });

    return {
      tenantId: updated.tenantId,
      tenantCode: updated.tenantCode,
      tenantPrefix: updated.tenantPrefix,
      gymName: updated.gymName,
      ownerName: updated.ownerName,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      addressLine: updated.addressLine,
      city: updated.city,
      state: updated.state,
      country: updated.country,
      pincode: updated.pincode,
      gstNumber: updated.gstNumber,
      logoUrl: updated.logoUrl,
      status: updated.status as TenantStatus,
      planId: updated.planId,
      planName: updated.plan?.planName || null,
      subscriptionStart: updated.subscriptionStart ? updated.subscriptionStart.toISOString().split('T')[0] : null,
      subscriptionEnd: updated.subscriptionEnd ? updated.subscriptionEnd.toISOString().split('T')[0] : null,
      membersCount: updated._count.members,
      usersCount: updated._count.users,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
