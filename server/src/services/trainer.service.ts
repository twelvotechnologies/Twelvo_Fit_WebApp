import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import {
  TrainerListItem,
  CreateTrainerDTO,
  UpdateTrainerDTO,
  TrainerStatsResponse,
  EmploymentStatus,
} from '../types/trainer.types.js';

export class TrainerService {
  /**
   * Helper to format a staff database record into TrainerListItem
   */
  private static formatTrainer(s: any): TrainerListItem {
    const staffIdStr = s.staffId.toString();
    const certs: string[] = s.certifications
      ? s.certifications.includes(',')
        ? s.certifications.split(',').map((c: string) => c.trim())
        : [s.certifications.trim()]
      : ['Certified Personal Trainer'];

    // Map DB status to frontend presentation status
    const dbStatus = (s.employmentStatus || 'active').toLowerCase();
    let statusEnum: 'ACTIVE' | 'IN_SESSION' | 'ON_LEAVE' | 'INACTIVE' = 'ACTIVE';
    if (dbStatus === 'in_session' || dbStatus === 'insession') statusEnum = 'IN_SESSION';
    else if (dbStatus === 'on_leave' || dbStatus === 'onleave' || dbStatus === 'leave') statusEnum = 'ON_LEAVE';
    else if (dbStatus === 'inactive') statusEnum = 'INACTIVE';

    const activeClientsCount = Array.isArray(s.assignedMembers) ? s.assignedMembers.length : 0;
    const baseSal = s.baseSalary ? Number(s.baseSalary) : 25000;
    const expYears = s.experienceYears ? Number(s.experienceYears) : 2;

    return {
      id: staffIdStr,
      staffId: staffIdStr,
      staffCode: s.staffCode || `TR-${staffIdStr}`,
      tenantId: s.tenantId,
      userId: s.userId ? s.userId.toString() : '0',
      name: s.fullName,
      fullName: s.fullName,
      role: s.designation || 'Fitness Coach',
      designation: s.designation || 'Fitness Coach',
      specialty: s.specialization || 'Strength & Conditioning',
      specialization: s.specialization || 'Strength & Conditioning',
      experienceYears: expYears,
      certifications: certs,
      email: s.email || '',
      phone: s.phone || '',
      photoUrl: s.photoUrl || null,
      joiningDate: s.joiningDate ? new Date(s.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: statusEnum,
      employmentStatus: dbStatus as EmploymentStatus,
      baseSalary: baseSal,
      commissionPerSession: 400,
      rating: 4.85,
      activeClients: activeClientsCount,
      sessionsThisMonth: Math.round(activeClientsCount * 2.2) || 12,
    };
  }

  /**
   * Retrieves all trainers belonging strictly to the authenticated tenant
   */
  static async getTrainers(
    tenantId: number,
    filters: { search?: string; status?: string; specialty?: string } = {}
  ): Promise<TrainerListItem[]> {
    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      where.employmentStatus = { equals: filters.status.toLowerCase(), mode: 'insensitive' };
    }

    if (filters.specialty && filters.specialty.toUpperCase() !== 'ALL') {
      where.specialization = { contains: filters.specialty, mode: 'insensitive' };
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
        { specialization: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { staffCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const staffList = await prisma.staff.findMany({
      where,
      include: {
        assignedMembers: {
          where: { isDeleted: false, status: 'ACTIVE' },
          select: { memberId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return staffList.map((s) => this.formatTrainer(s));
  }

  /**
   * Retrieves a single trainer by ID ensuring tenant isolation
   */
  static async getTrainerById(tenantId: number, staffId: string): Promise<TrainerListItem> {
    const staff = await prisma.staff.findFirst({
      where: {
        staffId: BigInt(staffId),
        tenantId,
        isDeleted: false,
      },
      include: {
        assignedMembers: {
          where: { isDeleted: false, status: 'ACTIVE' },
          select: { memberId: true },
        },
      },
    });

    if (!staff) {
      const err = new Error('Trainer not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    return this.formatTrainer(staff);
  }

  /**
   * Creates a new trainer under the authenticated tenant
   */
  static async createTrainer(tenantId: number, data: CreateTrainerDTO): Promise<TrainerListItem> {
    if (!data.fullName || data.fullName.trim().length < 2) {
      const err = new Error('Trainer name is required.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch tenant to get prefix for code generation
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { tenantId: true, tenantPrefix: true },
    });

    if (!tenant) {
      const err = new Error('Gym tenant not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    // 2. Generate unique staff code, e.g. TWTR1002
    const totalStaffCount = await prisma.staff.count({ where: { tenantId } });
    const prefix = tenant.tenantPrefix || 'GYM';
    const staffCode = `${prefix}TR${1001 + totalStaffCount}`;

    // 3. Create linked user account for trainer login
    const baseUsername = (data.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_trainer').slice(0, 30);
    let username = baseUsername;
    let counter = 1;

    while (true) {
      const existingUser = await prisma.user.findFirst({
        where: { tenantId, username },
      });
      if (!existingUser) break;
      username = `${baseUsername.slice(0, 26)}${counter}`;
      counter++;
    }

    const defaultPassword = 'Trainer@1234';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const user = await prisma.user.create({
      data: {
        tenantId,
        username,
        email: data.email || null,
        phoneNumber: data.phone || null,
        passwordHash,
        role: 'trainer',
        fullName: data.fullName.trim(),
        isActive: true,
      },
    });

    // 4. Create Staff record
    const certificationsStr = Array.isArray(data.certifications)
      ? data.certifications.join(', ')
      : data.certifications || 'Certified Personal Trainer';

    const newStaff = await prisma.staff.create({
      data: {
        tenantId,
        userId: user.userId,
        staffCode,
        fullName: data.fullName.trim(),
        designation: data.designation || data.role || 'Personal Trainer',
        specialization: data.specialization || data.specialty || 'Strength & Conditioning',
        experienceYears: data.experienceYears !== undefined ? data.experienceYears : 2,
        certifications: certificationsStr,
        email: data.email ? data.email.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
        employmentStatus: (data.employmentStatus || 'active').toLowerCase(),
        baseSalary: data.baseSalary !== undefined ? data.baseSalary : 28000,
      },
      include: {
        assignedMembers: true,
      },
    });

    return this.formatTrainer(newStaff);
  }

  /**
   * Updates an existing trainer ensuring tenant isolation
   */
  static async updateTrainer(
    tenantId: number,
    staffId: string,
    data: UpdateTrainerDTO
  ): Promise<TrainerListItem> {
    const existing = await prisma.staff.findFirst({
      where: {
        staffId: BigInt(staffId),
        tenantId,
        isDeleted: false,
      },
    });

    if (!existing) {
      const err = new Error('Trainer not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.designation !== undefined || data.role !== undefined) {
      updateData.designation = data.designation || data.role;
    }
    if (data.specialization !== undefined || data.specialty !== undefined) {
      updateData.specialization = data.specialization || data.specialty;
    }
    if (data.experienceYears !== undefined) updateData.experienceYears = Number(data.experienceYears);
    if (data.email !== undefined) updateData.email = data.email.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
    if (data.baseSalary !== undefined) updateData.baseSalary = Number(data.baseSalary);
    if (data.employmentStatus !== undefined) {
      updateData.employmentStatus = data.employmentStatus.toLowerCase();
    }
    if (data.certifications !== undefined) {
      updateData.certifications = Array.isArray(data.certifications)
        ? data.certifications.join(', ')
        : data.certifications;
    }

    const updated = await prisma.staff.update({
      where: { staffId: BigInt(staffId) },
      data: updateData,
      include: {
        assignedMembers: {
          where: { isDeleted: false, status: 'ACTIVE' },
          select: { memberId: true },
        },
      },
    });

    return this.formatTrainer(updated);
  }

  /**
   * Soft deletes a trainer ensuring tenant isolation
   */
  static async deleteTrainer(tenantId: number, staffId: string): Promise<void> {
    const existing = await prisma.staff.findFirst({
      where: {
        staffId: BigInt(staffId),
        tenantId,
        isDeleted: false,
      },
    });

    if (!existing) {
      const err = new Error('Trainer not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    await prisma.staff.update({
      where: { staffId: BigInt(staffId) },
      data: { isDeleted: true },
    });
  }

  /**
   * Retrieves summary statistics for trainers under this tenant
   */
  static async getTrainerStats(tenantId: number): Promise<TrainerStatsResponse> {
    const trainers = await prisma.staff.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        assignedMembers: {
          where: { isDeleted: false, status: 'ACTIVE' },
          select: { memberId: true },
        },
      },
    });

    const totalTrainers = trainers.length;
    const activeOnFloor = trainers.filter(
      (t) => (t.employmentStatus || 'active').toLowerCase() === 'active'
    ).length;
    const totalClients = trainers.reduce(
      (acc, curr) => acc + (curr.assignedMembers?.length || 0),
      0
    );

    return {
      totalTrainers,
      activeOnFloor,
      totalClients,
      avgRating: 4.86,
    };
  }
}
