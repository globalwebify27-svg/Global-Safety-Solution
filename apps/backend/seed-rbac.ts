import { PrismaClient } from '@repo/database';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Permissions...');
  const permissions = [
      { name: 'VIEW_DASHBOARD', module: 'DASHBOARD', description: 'Access to main dashboard' },
      { name: 'VIEW_CLIENTS', module: 'CLIENTS', description: 'View client list and details' },
      { name: 'MANAGE_CLIENTS', module: 'CLIENTS', description: 'Create, update and delete clients' },
      { name: 'VIEW_LEADS', module: 'SALES', description: 'View sales leads' },
      { name: 'MANAGE_LEADS', module: 'SALES', description: 'Manage leads pipeline' },
      { name: 'VIEW_QUOTATIONS', module: 'SALES', description: 'View quotations' },
      { name: 'MANAGE_QUOTATIONS', module: 'SALES', description: 'Create and approve quotations' },
      { name: 'VIEW_INVOICES', module: 'FINANCE', description: 'View invoices' },
      { name: 'MANAGE_INVOICES', module: 'FINANCE', description: 'Create and send invoices' },
      { name: 'MANAGE_PAYMENTS', module: 'FINANCE', description: 'Record and manage payments' },
      { name: 'VIEW_STAFF', module: 'HR', description: 'View employee directory' },
      { name: 'MANAGE_STAFF', module: 'HR', description: 'Onboard and manage employee profiles' },
      { name: 'VIEW_PAYROLL', module: 'HR', description: 'View payroll history' },
      { name: 'MANAGE_PAYROLL', module: 'HR', description: 'Generate and process payroll batches' },
      { name: 'VIEW_PROJECTS', module: 'OPERATIONS', description: 'View projects' },
      { name: 'MANAGE_PROJECTS', module: 'OPERATIONS', description: 'Manage project lifecycle' },
      { name: 'VIEW_INSPECTIONS', module: 'OPERATIONS', description: 'View site inspections' },
      { name: 'MANAGE_INSPECTIONS', module: 'OPERATIONS', description: 'Schedule and complete inspections' },
      { name: 'VIEW_COMPLIANCE', module: 'COMPLIANCE', description: 'View compliance status' },
      { name: 'MANAGE_COMPLIANCE', module: 'COMPLIANCE', description: 'Manage compliance certificates and renewals' },
      { name: 'MANAGE_SYSTEM_SETTINGS', module: 'SYSTEM', description: 'Change organization and system settings' },
      { name: 'MANAGE_ROLES', module: 'SYSTEM', description: 'Manage roles and permissions' },
      { name: 'READ_DOCUMENT', module: 'VAULT', description: 'Read and download vault documents' },
      { name: 'CREATE_DOCUMENT', module: 'VAULT', description: 'Upload and encrypt documents to vault' },
      { name: 'DELETE_DOCUMENT', module: 'VAULT', description: 'Revoke and delete vault documents' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }
  console.log('Permissions seeded.');

  console.log('Seeding Roles...');
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Complete system access with authority to manage roles and organization settings.' },
    { name: 'HR_MANAGER', description: 'Manage employee lifecycle, attendance, and payroll.' },
    { name: 'FIELD_ENGINEER', description: 'Perform site inspections and upload safety reports.' },
    { name: 'SALES_EXECUTIVE', description: 'Manage leads and generate quotations.' },
    { name: 'CLIENT', description: 'Access to project reports, invoices, and certificates.' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log('Roles seeded.');

  console.log('Mapping Permissions to Roles...');
  const allPerms = await prisma.permission.findMany();
  const rolePermissionMapping: Record<string, string[]> = {
    SUPER_ADMIN: allPerms.filter(p => p.module !== 'FIELD_TASKS').map(p => p.id),
    HR_MANAGER: allPerms.filter(p => ['DASHBOARD', 'HR', 'SYSTEM'].includes(p.module)).map(p => p.id),
    SALES_EXECUTIVE: allPerms.filter(p => ['DASHBOARD', 'SALES', 'FINANCE', 'CLIENTS'].includes(p.module)).map(p => p.id),
    FIELD_ENGINEER: allPerms.filter(p => ['DASHBOARD', 'FIELD_TASKS'].includes(p.module)).map(p => p.id),
    CLIENT: allPerms.filter(p => p.name === 'READ_DOCUMENT').map(p => p.id),
  };

  for (const [roleName, permIds] of Object.entries(rolePermissionMapping)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      // Clear existing mappings to prevent duplicates
      await prisma.rolePermission.deleteMany({ where: { role_id: role.id } });
      // Create new mappings
      for (const permId of permIds) {
        await prisma.rolePermission.create({
          data: {
            role_id: role.id,
            permission_id: permId,
          },
        });
      }
    }
  }
  console.log('Permissions mapped to roles successfully.');

  // Find Super Admin and assign role
  const admin = await prisma.user.findUnique({ where: { email: 'admin@globalsafety.com' } });
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  
  if (admin && superAdminRole) {
    await prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: admin.id, role_id: superAdminRole.id } },
      update: {},
      create: { user_id: admin.id, role_id: superAdminRole.id },
    });
    console.log('SUPER_ADMIN role assigned to admin.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
