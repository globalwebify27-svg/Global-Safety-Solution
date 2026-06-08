const { PrismaClient } = require('@repo/database');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting full ERP data seeding...');

  // 1. Get the default Super Admin or check for users
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@globalsafety.com' }
  });
  if (!admin) {
    console.error('Run the core migrations/seeds first to create the superadmin user!');
    return;
  }
  const passwordHash = admin.password_hash;

  // 2. Clear old test data to prevent duplicates
  console.log('Cleaning existing transaction and operational data...');
  await prisma.ledgerEntry.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.leadActivity.deleteMany({});
  await prisma.leadTransaction.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.compliance.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.payrollRecord.deleteMany({});
  
  // Reset accounts balance to 0
  await prisma.account.updateMany({ data: { balance: 0.00 } });

  // 3. Create realistic Field Engineers / Staff
  console.log('Creating staff members...');
  const engineer1 = await prisma.user.upsert({
    where: { email: 'ankit@globalsafety.com' },
    update: { is_active: true },
    create: {
      name: 'Ankit Sharma',
      email: 'ankit@globalsafety.com',
      password_hash: passwordHash,
      department: 'OPERATIONS',
      designation: 'Sr. Field Safety Engineer',
      employee_id: 'EMP-001',
      join_date: new Date('2025-01-15'),
      base_salary: 45000.00,
      leave_balance: 24,
      is_active: true,
    }
  });

  const engineer2 = await prisma.user.upsert({
    where: { email: 'sanjay@globalsafety.com' },
    update: { is_active: true },
    create: {
      name: 'Sanjay Gupta',
      email: 'sanjay@globalsafety.com',
      password_hash: passwordHash,
      department: 'OPERATIONS',
      designation: 'Safety Inspector',
      employee_id: 'EMP-002',
      join_date: new Date('2025-03-01'),
      base_salary: 38000.00,
      leave_balance: 24,
      is_active: true,
    }
  });

  // Assign roles
  const engineerRole = await prisma.role.findFirst({ where: { name: 'FIELD_ENGINEER' } });
  if (engineerRole) {
    await prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: engineer1.id, role_id: engineerRole.id } },
      update: {},
      create: { user_id: engineer1.id, role_id: engineerRole.id }
    });
    await prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: engineer2.id, role_id: engineerRole.id } },
      update: {},
      create: { user_id: engineer2.id, role_id: engineerRole.id }
    });
  }

  // 4. Create Clients
  console.log('Creating clients...');
  const clientTitan = await prisma.client.create({
    data: {
      name: 'Titan Industries Ltd',
      gst_number: '29AAACT1234A1Z1',
      pan_number: 'AAACT1234A',
      email: 'procurement@titan.co.in',
      phone: '+91 80 2221 2345',
      billing_address: '3, Hosur Road, Madiwala',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560068',
      industry: 'Manufacturing',
      assigned_staff_id: admin.id,
    }
  });

  const clientTata = await prisma.client.create({
    data: {
      name: 'Tata Steel Jamshedpur',
      gst_number: '20AAACT5678B2Z2',
      pan_number: 'AAACT5678B',
      email: 'safety.inspections@tatasteel.com',
      phone: '+91 657 242 1234',
      billing_address: 'Tata Steel Works, Bistupur',
      city: 'Jamshedpur',
      state: 'Jharkhand',
      country: 'India',
      pincode: '831001',
      industry: 'Heavy Metals',
      assigned_staff_id: admin.id,
    }
  });

  // 5. Create Leads in Sales Pipeline
  console.log('Creating leads...');
  const lead1 = await prisma.lead.create({
    data: {
      company_name: 'Adani Ports Ltd',
      contact_person: 'Rajesh Adani',
      email: 'rajesh@adaniports.com',
      phone: '+91 79 2656 5555',
      source: 'Website Form',
      status: 'NEGOTIATION',
      notes: 'Interested in comprehensive port safety audit and equipment check.',
      assigned_to: admin.id,
      closure_probability: 70,
      expected_value: 150000.00,
      next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    }
  });

  const lead2 = await prisma.lead.create({
    data: {
      company_name: 'Reliance Industries Hazira',
      contact_person: 'Mukesh Patel',
      email: 'm.patel@ril.com',
      phone: '+91 22 2278 5000',
      source: 'Referral',
      status: 'NEW',
      notes: 'Wants layout drawing certifications and factory license consultancy.',
      assigned_to: admin.id,
      closure_probability: 30,
      expected_value: 80000.00,
      next_follow_up: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  });

  // 6. Create Quotations
  console.log('Creating quotations...');
  const quoteTitan = await prisma.quotation.create({
    data: {
      client_id: clientTitan.id,
      quote_number: 'GSS/2026/001',
      subtotal: 100000.00,
      discount: 0.00,
      tax_amount: 18000.00, // 18% GST
      cgst: 9000.00,
      sgst: 9000.00,
      igst: 0.00,
      total_amount: 118000.00,
      status: 'ACCEPTED',
      notes: 'Includes Factory Audit and Lifting Tools Proof Load tests.',
      items: {
        create: [
          { description: 'External Safety Audit (DISH Guidelines)', quantity: 1, unit_price: 60000.00, total: 60000.00 },
          { description: 'Proof Load Testing & Certification of Lifting Tools', quantity: 8, unit_price: 5000.00, total: 40000.00 }
        ]
      }
    },
    include: { items: true }
  });

  // 7. Create Project in Operations
  console.log('Creating operational projects and tasks...');
  const projectTitan = await prisma.project.create({
    data: {
      client_id: clientTitan.id,
      name: 'Titan Safety Audit & Proof Load Testing 2026',
      description: 'Annual safety inspection and testing of overhead cranes and safety audits for Hosur Plant.',
      status: 'ONGOING',
      tasks: {
        create: [
          { title: 'Visual Inspection of Overhead Cranes', description: 'Check for cracks, deformation, hook latch wear', status: 'DONE', priority: 'HIGH', assigned_to: engineer1.id },
          { title: 'Proof Load Application & Deflection Test', description: 'Apply 125% proof load and measure deflection', status: 'IN_PROGRESS', priority: 'CRITICAL', assigned_to: engineer1.id },
          { title: 'Drafting Safety Audit Report', description: 'Compile safety compliance questionnaire observations', status: 'TODO', priority: 'MEDIUM', assigned_to: engineer2.id }
        ]
      }
    }
  });

  // 8. Create Invoices
  console.log('Creating invoices...');
  const invoiceTitan = await prisma.invoice.create({
    data: {
      client_id: clientTitan.id,
      quotation_id: quoteTitan.id,
      invoice_number: 'INV-2026-0001',
      subtotal: 100000.00,
      discount: 0.00,
      tax_amount: 18000.00,
      cgst: 9000.00,
      sgst: 9000.00,
      igst: 0.00,
      total_amount: 118000.00,
      status: 'PARTIAL',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      notes: '50% advance invoice for commencement of Safety Audits.'
    }
  });

  // 9. Create Payments
  console.log('Recording payments...');
  const paymentTitan = await prisma.payment.create({
    data: {
      invoice_id: invoiceTitan.id,
      amount: 59000.00,
      payment_method: 'NEFT',
      transaction_id: 'TXN9988776655',
      payment_date: new Date()
    }
  });

  // 10. Seeding Ledger Vouchers (Double Entry)
  console.log('Posting double-entry journal vouchers...');
  
  // Voucher 1: Invoice generated (Dr. Receivables / Cr. Sales Revenue)
  await prisma.$transaction(async (tx) => {
    const receivablesAcc = await tx.account.findUnique({ where: { code: '1200' } });
    const salesAcc = await tx.account.findUnique({ where: { code: '4000' } });
    
    if (receivablesAcc && salesAcc) {
      await tx.ledgerEntry.create({
        data: {
          voucher_no: 'JV-2026-0001',
          description: `Auto-generated: Invoice created for ${invoiceTitan.invoice_number} (Titan Industries Ltd)`,
          amount: 118000.00,
          debit_account_id: receivablesAcc.id,
          credit_account_id: salesAcc.id,
          created_by: 'System',
          transaction_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      });
      // Increase Receivables Asset
      await tx.account.update({ where: { id: receivablesAcc.id }, data: { balance: { increment: 118000.00 } } });
      // Increase Revenue
      await tx.account.update({ where: { id: salesAcc.id }, data: { balance: { increment: 118000.00 } } });
    }
  });

  // Voucher 2: Advance payment received (Dr. Bank / Cr. Receivables)
  await prisma.$transaction(async (tx) => {
    const bankAcc = await tx.account.findUnique({ where: { code: '1010' } });
    const receivablesAcc = await tx.account.findUnique({ where: { code: '1200' } });
    
    if (bankAcc && receivablesAcc) {
      await tx.ledgerEntry.create({
        data: {
          voucher_no: 'JV-2026-0002',
          description: `Auto-generated: Payment received for Invoice ${invoiceTitan.invoice_number} (Titan Industries Ltd)`,
          amount: 59000.00,
          debit_account_id: bankAcc.id,
          credit_account_id: receivablesAcc.id,
          created_by: 'System',
          transaction_date: new Date()
        }
      });
      // Increase Bank Asset
      await tx.account.update({ where: { id: bankAcc.id }, data: { balance: { increment: 59000.00 } } });
      // Decrease Receivables Asset
      await tx.account.update({ where: { id: receivablesAcc.id }, data: { balance: { decrement: 59000.00 } } });
    }
  });

  // 11. Create Attendance Entries
  console.log('Seeding employee attendance records...');
  const today = new Date();
  for (let d = 1; d <= 5; d++) {
    const checkInDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d, 9, 0, 0);
    const checkOutDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d, 18, 0, 0);
    
    await prisma.attendance.create({
      data: {
        user_id: engineer1.id,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - d),
        check_in: checkInDate,
        check_out: checkOutDate,
        status: 'PRESENT'
      }
    });

    await prisma.attendance.create({
      data: {
        user_id: engineer2.id,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - d),
        check_in: checkInDate,
        check_out: checkOutDate,
        status: 'PRESENT'
      }
    });
  }

  // 12. Seeding Payroll records
  console.log('Seeding payroll statements...');
  await prisma.payrollRecord.create({
    data: {
      user_id: engineer1.id,
      month: today.getMonth(),
      year: today.getFullYear(),
      base_salary: 45000.00,
      bonus: 2500.00,
      deductions: 1500.00,
      net_pay: 46000.00,
      status: 'PAID',
      paid_at: new Date(today.getFullYear(), today.getMonth(), 1)
    }
  });

  // 13. Seeding Client Compliance Tracker
  console.log('Seeding compliance certificates...');
  await prisma.compliance.create({
    data: {
      client_id: clientTitan.id,
      compliance_type: 'Factory Safety Certificate (Form 1)',
      reference_number: 'DISH-KA-5566-2026',
      issue_date: new Date('2025-06-01'),
      expiry_date: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), // Active
      status: 'ACTIVE'
    }
  });

  await prisma.compliance.create({
    data: {
      client_id: clientTata.id,
      compliance_type: 'Structural Stability Certificate',
      reference_number: 'ST-WORKS-7788',
      issue_date: new Date('2024-05-15'),
      expiry_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Expired
      status: 'EXPIRED'
    }
  });

  // 14. Seeding Site Inspections
  console.log('Seeding site inspection records...');
  // Find a service product first
  const service = await prisma.serviceProduct.findFirst();
  
  await prisma.inspection.create({
    data: {
      project_id: projectTitan.id,
      client_id: clientTitan.id,
      engineer_id: engineer1.id,
      scheduled_date: new Date(),
      status: 'COMPLETED',
      remarks: 'Completed structural lifting audit on Hosur plant EOT crane. All load indicators within acceptable range.',
      items: {
        create: [
          { description: 'Visual crane structure check', status: 'PASS' },
          { description: 'Limit switch response check', status: 'PASS' },
          { description: 'Proof Load deflection measure', status: 'PASS' }
        ]
      }
    }
  });

  // 15. Create Document in Digital Vault
  console.log('Seeding documents in digital vault...');
  await prisma.document.create({
    data: {
      client_id: clientTitan.id,
      project_id: projectTitan.id,
      name: 'Titan Hosur EOT Crane Stability Certificate',
      file_url: '/uploads/certificates/titan_crane_certificate_2026.pdf',
      file_type: 'pdf',
      file_size: 1048576, // 1MB
      category: 'CERTIFICATE',
      uploaded_by: admin.id,
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('Full ERP system seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
