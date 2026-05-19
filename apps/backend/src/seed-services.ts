import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const services = [
  {
    name: 'Testing and Certification of Lifting Tools & Tackles',
    description:
      'Statutory testing and certification of lifting equipment, tackles, and pressure vessels following IS and Factory Act standards.',
    category: 'TESTING',
    checklist: [
      { question: 'Equipment Serial Number', field_type: 'TEXT' },
      { question: 'Safe Working Load (SWL)', field_type: 'NUMBER' },
      {
        question: 'Visual Inspection (Cracks/Deformation)',
        field_type: 'BOOLEAN',
      },
      { question: 'Proof Load Applied (kg)', field_type: 'NUMBER' },
      {
        question: 'Condition of Wire Rope/Chain',
        field_type: 'DROPDOWN',
        options: 'Good,Worn,Damaged',
      },
    ],
  },
  {
    name: 'Pressure Vessel Testing (Air Receiver)',
    description:
      'Professional testing of air receivers and pressure vessels as per Factory Act 1948 Section 31.',
    category: 'TESTING',
    checklist: [
      { question: 'Vessel Identity Number', field_type: 'TEXT' },
      { question: 'Design Pressure (kg/cm2)', field_type: 'NUMBER' },
      { question: 'Hydrostatic Test Pressure', field_type: 'NUMBER' },
      { question: 'Condition of Safety Valves', field_type: 'BOOLEAN' },
      {
        question: 'Corrosion Assessment',
        field_type: 'DROPDOWN',
        options: 'None,Slight,Heavy',
      },
    ],
  },
  {
    name: 'Building Stability Certification',
    description:
      'Certified structural stability evaluations for industrial buildings as per Factory Rules.',
    category: 'CERTIFICATION',
    checklist: [
      { question: 'Building Age (Years)', field_type: 'NUMBER' },
      { question: 'Structural Cracks Noticed?', field_type: 'BOOLEAN' },
      { question: 'Load Bearing Capacity Verified?', field_type: 'BOOLEAN' },
      { question: 'Foundation Settlement Signs?', field_type: 'BOOLEAN' },
    ],
  },
  {
    name: 'Factory Layout Map Approval',
    description:
      'Preparation and approval of factory layout maps with Directorate of Factories.',
    category: 'LICENSING',
    checklist: [
      { question: 'Proposed Floor Area (sqm)', field_type: 'NUMBER' },
      { question: 'Emergency Exits Marked?', field_type: 'BOOLEAN' },
      { question: 'Machinery Layout Verified?', field_type: 'BOOLEAN' },
    ],
  },
  {
    name: 'Factory License (New/Amendment/Transfer)',
    description:
      'End-to-end assistance for obtaining or modifying factory licenses.',
    category: 'LICENSING',
    checklist: [
      { question: 'Number of Workers', field_type: 'NUMBER' },
      { question: 'Installed Power (HP/kW)', field_type: 'NUMBER' },
      { question: 'Ownership Documents Verified?', field_type: 'BOOLEAN' },
    ],
  },
  {
    name: 'External Safety Audit',
    description:
      'Comprehensive third-party safety audits as per DISH guidelines.',
    category: 'AUDIT',
    checklist: [
      { question: 'Fire Safety Compliance', field_type: 'BOOLEAN' },
      {
        question: 'Electrical Safety Status',
        field_type: 'DROPDOWN',
        options: 'Safe,Needs Improvement,Hazardous',
      },
      { question: 'PPE Usage Observed?', field_type: 'BOOLEAN' },
      {
        question: 'Safety Training Records Up to Date?',
        field_type: 'BOOLEAN',
      },
    ],
  },
  {
    name: 'Workplace Hygiene Testing (Dust/Noise/Heat/Lux)',
    description:
      'Professional hygiene testing services as per statutory guidelines.',
    category: 'TESTING',
    checklist: [
      {
        question: 'Parameter Type',
        field_type: 'DROPDOWN',
        options: 'Noise,Dust,Illumination,Heat',
      },
      { question: 'Measured Value', field_type: 'NUMBER' },
      { question: 'Statutory Limit', field_type: 'NUMBER' },
      { question: 'Result Within Limit?', field_type: 'BOOLEAN' },
    ],
  },
];

async function main() {
  console.log('Seeding Services...');
  for (const s of services) {
    const { checklist, ...productData } = s;

    // Check if exists
    const existing = await prisma.serviceProduct.findFirst({
      where: { name: s.name },
    });

    if (!existing) {
      await prisma.serviceProduct.create({
        data: {
          ...productData,
          checklist: {
            create: checklist,
          },
        },
      });
    }
  }
  console.log('Services seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
