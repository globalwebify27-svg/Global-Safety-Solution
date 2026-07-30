import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('🌱 Seeding Operations Demo Data...');

  // 1. Ensure Demo Client
  let client = await prisma.client.findFirst({
    where: { name: 'Apex Commercial Towers Pvt Ltd' },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: 'Apex Commercial Towers Pvt Ltd',
        email: 'vikram@apextowers.com',
        phone: '+91 98765 43210',
        billing_address: 'Plot 42, Cyber City, Phase 2, Gurugram, HR',
        gst_number: '07AAAAA0000A1Z5',
        is_active: true,
      },
    });
    console.log('✅ Created Client: Apex Commercial Towers Pvt Ltd');
  }

  // 2. Ensure Approved Demo Quotation
  let quote1 = await prisma.quotation.findFirst({
    where: { quote_number: 'QT-2026-APEX01' },
  });

  if (!quote1) {
    quote1 = await prisma.quotation.create({
      data: {
        quote_number: 'QT-2026-APEX01',
        client_id: client.id,
        status: 'SENT',
        total_amount: 250000.00,
        subtotal: 250000.00,
        items: {
          create: [
            { description: 'Annual Fire Safety System Audit', quantity: 1, unit_price: 120000.00, total: 120000.00 },
            { description: 'Pressure Vessel Hydro-Testing', quantity: 2, unit_price: 40000.00, total: 80000.00 },
            { description: 'Thermography & Electrical Audit', quantity: 1, unit_price: 50000.00, total: 50000.00 },
          ]
        },
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('✅ Created Proposal QT-2026-APEX01 (Status: SENT)');
  }

  // 3. Ensure Demo Engineer User
  let engineer = await prisma.user.findFirst({
    where: { email: 'engineer@globalsafety.com' },
  });

  if (!engineer) {
    engineer = await prisma.user.findFirst();
  }

  // 4. Create Demo Operations Projects at Various Stages
  const demoProjects = [
    {
      name: 'Cyber Towers - Annual Fire Safety Audit 2026',
      stage: 'PROJECT_CREATED',
      contract_value: 120000.00,
      description: 'Comprehensive audit of fire sprinklers, hydrants, and alarm systems across 12 floors.',
    },
    {
      name: 'High-Pressure Boiler & Vessel Certification',
      stage: 'ENGINEER_ASSIGNED',
      contract_value: 80000.00,
      description: 'Ultrasonic thickness test and hydrostatic pressure verification.',
    },
    {
      name: 'Factory Electrical & Thermal Hazard Assessment',
      stage: 'INSPECTION_SCHEDULED',
      contract_value: 50000.00,
      description: 'Infrared thermography scan of main LT/HT panels and transformer yards.',
    },
    {
      name: 'Tower B Crane & Hoist Stability Certification',
      stage: 'CERTIFICATE_GENERATED',
      contract_value: 95000.00,
      description: 'Load test and safety certification for material hoists.',
    },
  ];

  for (const projData of demoProjects) {
    const existing = await prisma.project.findFirst({
      where: { name: projData.name },
    });

    if (!existing) {
      const proj = await prisma.project.create({
        data: {
          name: projData.name,
          client_id: client.id,
          stage: projData.stage,
          contract_value: projData.contract_value,
          quotation_id: quote1.id,
          status: projData.stage === 'PROJECT_CLOSED' ? 'COMPLETED' : 'IN_PROGRESS',
        },
      });

      // Add Initial Timeline Activity
      await prisma.projectActivity.create({
        data: {
          project_id: proj.id,
          action: 'PROJECT_CREATED',
          performed_by: 'System Administrator',
          remarks: `Project converted from Quotation QT-2026-APEX01 with contract value ₹${projData.contract_value.toLocaleString('en-IN')}`,
        },
      });

      if (projData.stage !== 'PROJECT_CREATED') {
        await prisma.projectActivity.create({
          data: {
            project_id: proj.id,
            action: projData.stage,
            performed_by: 'Operation Manager',
            remarks: `Project automatically advanced to ${projData.stage.replace('_', ' ')}.`,
          },
        });
      }

      console.log(`✅ Created Operations Project: ${proj.name} [Stage: ${proj.stage}]`);
    }
  }

  console.log('🎉 Operations Demo Data Seeding Complete!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error seeding demo data:', err);
  process.exit(1);
});
