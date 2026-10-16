import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Gym ERP PostgreSQL database...');

  // 1. SaaS Plan
  const plan = await prisma.plan.upsert({
    where: { planCode: 'PRO-ANNUAL' },
    update: {},
    create: {
      planName: 'Pro Annual',
      planCode: 'PRO-ANNUAL',
      durationMonths: 12,
      price: 19999.0,
      currency: 'INR',
      maxMembers: 1000,
      maxTrainers: 20,
      features: { reports: true, multiTrainer: true, accounting: true },
      isActive: true,
    },
  });

  // 2. Tenant
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode: 'GYM0001' },
    update: {
      tenantPrefix: 'TW',
      gymName: 'Twelvo Gym & Fitness',
      ownerName: 'Paul Saji',
      email: 'owner@twelvogym.com',
    },
    create: {
      tenantCode: 'GYM0001',
      tenantPrefix: 'TW',
      gymName: 'Twelvo Gym & Fitness',
      ownerName: 'Paul Saji',
      email: 'owner@twelvogym.com',
      phoneNumber: '+91 9876543210',
      addressLine: '123 MG Road, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560034',
      status: 'active',
      planId: plan.planId,
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // 3. User (Owner)
  const ownerUser = await prisma.user.upsert({
    where: {
      uq_users_tenant_username: {
        tenantId: tenant.tenantId,
        username: 'paul_owner',
      },
    },
    update: {
      email: 'paul@twelvogym.com',
      fullName: 'Paul Saji',
    },
    create: {
      tenantId: tenant.tenantId,
      username: 'paul_owner',
      email: 'paul@twelvogym.com',
      phoneNumber: '+91 9876543210',
      passwordHash: '$2b$10$e7Z1w7N6K.MockHashedPasswordForDemoSeed1234567890',
      role: 'gym_owner',
      fullName: 'Paul Saji',
      isActive: true,
    },
  });

  // 4. Staff (Trainer User & Staff Profile)
  const trainerUser = await prisma.user.upsert({
    where: {
      uq_users_tenant_username: {
        tenantId: tenant.tenantId,
        username: 'rahul_trainer',
      },
    },
    update: {
      email: 'rahul@twelvogym.com',
    },
    create: {
      tenantId: tenant.tenantId,
      username: 'rahul_trainer',
      email: 'rahul@twelvogym.com',
      phoneNumber: '+91 9876543211',
      passwordHash: '$2b$10$e7Z1w7N6K.MockHashedPasswordForDemoSeed1234567890',
      role: 'trainer',
      fullName: 'Rahul Sharma',
      isActive: true,
    },
  });

  const staff = await prisma.staff.upsert({
    where: { staffCode: 'TWTR1001' },
    update: {
      email: 'rahul@twelvogym.com',
    },
    create: {
      tenantId: tenant.tenantId,
      userId: trainerUser.userId,
      staffCode: 'TWTR1001',
      fullName: 'Rahul Sharma',
      designation: 'Senior Crossfit Trainer',
      specialization: 'CrossFit, Strength & Conditioning',
      experienceYears: 5.5,
      certifications: 'ACE Certified Personal Trainer, CSCS',
      email: 'rahul@twelvogym.com',
      phone: '+91 9876543211',
      joiningDate: new Date('2023-01-15'),
      employmentStatus: 'active',
      baseSalary: 35000.0,
    },
  });

  // 5. Gym Member Plans (Plans Catalog)
  const monthlyPlan = await prisma.plansCatalog.upsert({
    where: {
      uq_plan_name_per_tenant: {
        tenantId: tenant.tenantId,
        planName: 'Monthly Gold',
      },
    },
    update: {},
    create: {
      tenantId: tenant.tenantId,
      planName: 'Monthly Gold',
      planCategory: 'Regular',
      durationValue: 1,
      durationUnit: 'Months',
      standardFee: 2500.0,
      isActive: true,
    },
  });

  // 6. Bank Account & UPI
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { tenantId: tenant.tenantId, accountName: 'HDFC Current A/C' },
  });

  const accountId = bankAccount
    ? bankAccount.bankAccountId
    : (
        await prisma.bankAccount.create({
          data: {
            tenantId: tenant.tenantId,
            accountName: 'HDFC Current A/C',
            bankName: 'HDFC Bank',
            accountHolderName: 'Twelvo Gym & Fitness',
            accountNumber: '50200012345678',
            ifscCode: 'HDFC0001234',
            branchName: 'Koramangala 4th Block',
            balanceType: 1,
            openingBalanceAmount: 50000.0,
            openingBalance: 50000.0,
            currentBalance: 50000.0,
            isPrimary: true,
            isActive: true,
          },
        })
      ).bankAccountId;

  await prisma.upiId.upsert({
    where: {
      uq_upi_handle_per_tenant: {
        tenantId: tenant.tenantId,
        upiHandle: 'twelvogym@okhdfcbank',
      },
    },
    update: {
      upiHandle: 'twelvogym@okhdfcbank',
    },
    create: {
      tenantId: tenant.tenantId,
      bankAccountId: accountId,
      upiLabel: 'HDFC Merchant QR',
      upiHandle: 'twelvogym@okhdfcbank',
      isPrimary: true,
      isActive: true,
    },
  });

  // 7. Cash Opening Balance Entry
  const existingOpening = await prisma.cashTransaction.findFirst({
    where: { tenantId: tenant.tenantId, isOpening: 0 },
  });

  if (!existingOpening) {
    await prisma.cashTransaction.create({
      data: {
        tenantId: tenant.tenantId,
        transactionType: 1,
        amount: 15000.0,
        isOpening: 0,
        transactionDate: new Date(),
        referenceType: 'MANUAL',
        description: 'Initial Cash-in-Hand Opening Balance',
        createdBy: ownerUser.userId,
      },
    });
  }

  // 8. Members
  const member1 = await prisma.member.upsert({
    where: { memberCode: 'TWMS1001' },
    update: {},
    create: {
      tenantId: tenant.tenantId,
      memberCode: 'TWMS1001',
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+91 9811122233',
      joiningDate: new Date('2024-01-10'),
      assignedTrainerId: staff.staffId,
      currentPlanId: monthlyPlan.planId,
      planStartDate: new Date('2024-01-10'),
      feeAmountAtSignup: 2500.0,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      onboardedVia: 'admin',
    },
  });

  await prisma.member.upsert({
    where: { memberCode: 'TWMS1002' },
    update: {},
    create: {
      tenantId: tenant.tenantId,
      memberCode: 'TWMS1002',
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+91 9822233344',
      joiningDate: new Date('2024-02-01'),
      assignedTrainerId: staff.staffId,
      currentPlanId: monthlyPlan.planId,
      planStartDate: new Date('2024-02-01'),
      feeAmountAtSignup: 2500.0,
      nextDueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      onboardedVia: 'trainer',
    },
  });

  console.log('✅ Seed completed successfully with multi-tenant mock data.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
