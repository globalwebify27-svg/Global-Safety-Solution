import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    name: "Report of Examination of Pressure safety Valve",
    description: "FORM NO. 8 (Prescribed under Section 31 of Factory Act 1948) (See Rule-57) - Pressure Safety Valve",
    html_content: "I / We certify that on {{cert_test_date}} the safety valve described above was thoroughly cleaned and (so far as its construction permits) made accessible for thorough examination and for such tests as were necessary for thorough examination and that on the said date. I/We thoroughly examined this safety valve including its fitting and that the above is true report of my examination.",
    fields: JSON.stringify([
      { label: "Situation and address of Factory", key: "factory_situation_address", default: "{{client_address}}" },
      { label: "Name description and distinctive number of Thermal Safety Valve", key: "tsv_name_description_number", default: "PRESSURE SAFETY VALVE\nCAP- 14182.0 kg/hr, Id/Sr No.- 201807175\nLoc- MLP Shed" },
      { label: "Name and Address of Manufacturer", key: "manufacturer_name_address", default: "Anderson Greenwood Crosby Sanmar Limited." },
      { label: "Nature of process in which it is use.", key: "process_nature", default: "For Plant Process" },
      { label: "Particulars of TSV: a]Year of Manufacture", key: "tsv_manufacture_year", default: "N.A" },
      { label: "Particulars of TSV: b] Date of commissioning in service", key: "tsv_commissioning_date", default: "N.A" },
      { label: "Particulars of TSV: c) Set pressure recommended by the manufacturer", key: "tsv_recommended_set_pressure", default: "58.52 kg/cm2" },
      { label: "Particulars of TSV: d) The history should be briefly given and the examiner should state whether he has seen the last/Previous report", key: "tsv_history", default: "As reported, the TSV has been working in order since inspection" },
      { label: "Date of last Hyd. test (if any) and pressure applied", key: "last_hyd_test_date_pressure", default: "On 11.10.2025 @ 58.52 kg/cm2" },
      { label: "Is the TSV in open or otherwise exposed to weather or to damp ?", key: "weather_exposure", default: "Under Shed" },
      { label: "What parts [if any were inaccessible)?", key: "inaccessible_parts", default: "Internal" },
      { label: "What examination and were made? [Specify pressure if Hydraulic test was carried out]", key: "examination_made", default: "Through Physical examination & Hydro test done." },
      { label: "Are all fittings and appliances properly maintained and in good condition? If not the defects should be recorded", key: "fittings_condition", default: "Yes." },
      { label: "Repairs [if any required and period within which they should be executed and any other condition which the person making the Examination thinks if necessary to specify for securing Set Pressure.", key: "repairs_required", default: "No major defect affecting the set pressure has been observed at the time of examination." },
      { label: "Where repair affecting the set pressure are required, state the Set pressure: a) Before the expiration of the period specified in [15]", key: "repair_set_pressure_a", default: "N.A" },
      { label: "Where repair affecting the set pressure are required, state the Set pressure: b) After the expiration of such period if the required repairs have not been completed", key: "repair_set_pressure_b", default: "N.A" },
      { label: "Where repair affecting the set pressure are required, state the Set pressure: c) After completion of the required repairs", key: "repair_set_pressure_c", default: "N.A" },
      { label: "Other observations.", key: "other_observations", default: "Satisfactory." }
    ])
  },
  {
    name: "Report of Examination of Pressure Vessel",
    description: "FORM NO. 8 (Prescribed under Section 31 of Factory Act 1948) (See Rule-57) - Pressure Vessel",
    html_content: "I / We certify that on {{cert_test_date}} the pressure vessels described above was thoroughly cleaned and (so far as its construction permits) made accessible for thorough examination and for such tests as were necessary for thorough examination and that on the said date. I/We thoroughly examined this pressure vessel including its fitting and that the above is true report of my examination.",
    fields: JSON.stringify([
      { label: "Location and address of Factory", key: "factory_location_address", default: "{{client_address}}" },
      { label: "Name, description and distinctive number of Pressure Vessel", key: "vessel_name_description_number", default: "AIR RECEIVER (VERTICAL)\nCAP- 550 Ltr, Sr/Id No.- 7806\nLoc- Compressor Room- 2" },
      { label: "Name and Address of Manufacturer", key: "manufacturer_name_address", default: "TALLERES VALSI" },
      { label: "Nature of process in which it is use.", key: "process_nature", default: "For Plant Process." },
      { label: "Particulars of vessel : a]Year of Manufacture", key: "vessel_manufacture_year", default: "25/09/2024" },
      { label: "Particulars of vessel : b] Date on which the vessel was first taken into use", key: "vessel_first_use_date", default: "2025" },
      { label: "Particulars of vessel : c] Thickness of walls", key: "vessel_walls_thickness", default: "Shell- 16.5mm, 16.6mm, 16.7mm T.Disc-15.2mm, 15.4mm, 15.3mm B.Disc-15.3mm, 15.2mm, 15.1mm" },
      { label: "Particulars of vessel : d] Safe working pressure recommended by the manufacturer", key: "vessel_recommended_pressure", default: "45 BAR" },
      { label: "Particulars of vessel : e) History of the vessel in brief", key: "vessel_history", default: "As reported, the vessels has been working in order since inspection" },
      { label: "Particulars of vessel : f) Has the examiner seen the last examination and test report? Was the vessel subjected to Hyd. test? If yes, the pressure applied.", key: "vessel_last_test_hyd", default: "Hydraulic Test done by the manufacturer on\nN.A" },
      { label: "Is the vessel is open, or otherwise exposed to weather or to damp?", key: "weather_exposure", default: "Under Shed" },
      { label: "Details of an examination made and test conducted by the examiner", key: "examination_details", default: "Thorough Physical examination & Ultrasonic test done." },
      { label: "What pressure was applied in hydraulic test was conducted by the examiner?", key: "hyd_test_pressure", default: "N.A" },
      { label: "What part, if any, were inaccessible?", key: "inaccessible_parts", default: "Internal Surface" },
      { label: "Condition of vessel (State any defects materially affecting the safe working pressure or the safe working of the vessel).", key: "vessel_condition", default: "External : Good\nInternal: Inaccessible." },
      { label: "Are fittings and appliances provided in accordance with the Rules for Pressure Plants? (Name fittings and appliances provided).", key: "fittings_provided", default: "Pressure gauge, Safety Valve & Drain Valve." },
      { label: "Are all fittings and appliances properly maintained and in good condition? If not the defects should be recorded.", key: "fittings_condition", default: "Yes." },
      { label: "Repairs, if any required, and the period within which they should be executed and any other condition which the person making the examination thinks it necessary to specify for securing safe working.", key: "repairs_required", default: "No major defect affecting the safe working has been observed at the time of examination." },
      { label: "Safe working pressure, calculate from dimensions and from the thickness and other data ascertained by the present examination, due allowance being made for conditions of working if unusual or exceptionally severe. [state minimum thickness of walls measured during the examination].", key: "calculated_safe_pressure", default: "45 BAR" },
      { label: "Where repairs affecting the safe working pressure are required, state the Working pressure: a) Before the expiration of the period specified in [15]", key: "repair_working_pressure_a", default: "N.A" },
      { label: "Where repairs affecting the safe working pressure are required, state the Working pressure: b) After the expiration of such period if the required repairs have not been completed.", key: "repair_working_pressure_b", default: "N.A" },
      { label: "Where repairs affecting the safe working pressure are required, state the Working pressure: c) After the completion of the required repairs.", key: "repair_working_pressure_c", default: "N.A" },
      { label: "Other observations", key: "other_observations", default: "Satisfactory." }
    ])
  },
  {
    name: "TESTING REPORT OF CHAIN PULLEY BLOCK",
    description: "TEST REPORT/CERTIFICATE (Lifting Tackles, Tools, Chains, Ropes, Cranes, Hoists etc.) - As required under Sub-Clause-III of Sub Sec. -1 U/S (28/29) OF THE FACTORIES ACT, 1948",
    html_content: "I / we certify that on dt. {{cert_test_date}} thoroughly examined the above mention lifting machine/ chain/ rope/ lifting tackle and that the above is correct report of the result. Next examination date on or before: {{cert_expiry_date}}",
    fields: JSON.stringify([
      { label: "Address of the Factory", key: "factory_address", default: "{{client_address}}" },
      { label: "Distinguishing number or marks, if any; and chain description sufficient to identify the lifting machine, rope, or the lifting tackle; Name of Eqpt", key: "eqpt_name", default: "CHAIN PULLEY BLOCK" },
      { label: "Distinguishing number or marks, if any; and chain description sufficient to identify the lifting machine, rope, or the lifting tackle; Cap/S.W.L", key: "eqpt_swl", default: "2 Ton, Lift : 4 Mtr" },
      { label: "Distinguishing number or marks, if any; and chain description sufficient to identify the lifting machine, rope, or the lifting tackle; Sl/Id No", key: "eqpt_serial_mfg", default: "RRL/CPB/04, Mfg- 11/2023" },
      { label: "Distinguishing number or marks, if any; and chain description sufficient to identify the lifting machine, rope, or the lifting tackle; Chain dia", key: "eqpt_chain_dia", default: "6 mm, H.Chain dia- 3 mm" },
      { label: "Distinguishing number or marks, if any; and chain description sufficient to identify the lifting machine, rope, or the lifting tackle; Mfd by", key: "eqpt_mfr", default: "N.A" },
      { label: "Distinguishing number or marks, if any; and chain description sufficient to identify the lifting machine, rope, or the lifting tackle; Location", key: "eqpt_location", default: "Inside the Plant" },
      { label: "Date on which the lifting machine, chain, rope or lifting tackle was first taken into use in the factory;", key: "first_use_date", default: "N.A" },
      { label: "Date and number of the certificate relating to any test and examination made under sub-rules (1) and (9) together with the name and address of the person who issued the certificate;", key: "prev_cert_info", default: "Last time tested by us." },
      { label: "Date of each periodical through examination made under sub-clause (iii) of clause (a) sub section(1) of section 29 and sub rule (8) and the name of the person by whom it was carried out;", key: "periodical_exam_info", default: "Periodically, being examined/tested by technical staff of the company." },
      { label: "Date of annealing or other heat treatment of the chain and other lifting tackle made under Sub-Rule (7) and the name of the person by whom it was carried out;", key: "annealing_date", default: "{{cert_test_date}}" },
      { label: "Particulars of any defects affecting the safe working load found at any such thorough examination or after annealing and of the steps taken to remedy such defects.", key: "defects_remedy_steps", default: "No such Defect was observed during thorough examination." },
      { label: "Detail of test performed.", key: "test_detail", default: "Throughly examined & load test carried out at 125% of SWL," },
      { label: "Result of test", key: "test_result", default: "Found satisfactory" }
    ])
  },
  {
    name: "FORM OF CERTIFICATE OF STABILITY",
    description: "FORM NO. 34 (See Rule – 3A) - FORM OF CERTIFICATE OF STABILITY under Factories Act 1948",
    html_content: "I certify that I have inspected the building/buildings the plan of which have been approved by the Chief Inspector of Factories in his letter No. 153/P Dated 09.12.2014 and examined the various parts including the foundations with special reference to the Machinery, Plant, etc., that have been installed. I am of the opinion that the building/buildings which has/have been constructed/reconstructed/extended/taken into use is/are in accordance with the plans approved by the Chief Inspector in his letter mentioned above, that is/they/are structurally sound and that its/their stability will not be endangered by its/their use as a Factory/part of the Factory for the Manufacturing of SNACKS & NAMKEENS for which the Machinery, Plant, etc. is intended.\n\n- Maintenance work is to be done annually.\n- Routine maintenance schedule to be attended too.\n- This certificate is valid for 3 Years from the date of issue.",
    fields: JSON.stringify([
      { label: "Village, Town and District in which the Factory is situated", key: "factory_location", default: "MUZAFFARPUR" },
      { label: "Full Postal Address of Factory", key: "factory_postal_address", default: "PLOT NO. NS 8P INDUSTRAL AREA BELA\nMUZAFFARPUR BIHAR- 842005" },
      { label: "Name of the Occupier of the Factory", key: "occupier_name", default: "VIKASH MODI" },
      { label: "Nature of the manufacturing process to be carried on in the Factory", key: "mfg_process", default: "SNACKS & NAMKEENS" },
      { label: "Number of floor on which worker will be Employed", key: "floors_employed", default: "As per approved layout (Attached Report)\n(With Ref No.: GSS/ISNPL-M/REPORT-ON/02/2026,\nDated: 20.02.2026)" }
    ])
  }
];

async function seed() {
  console.log('Seeding certificate templates...');
  for (const t of templates) {
    const existing = await prisma.certificateTemplate.findFirst({
      where: { name: t.name }
    });

    if (existing) {
      await prisma.certificateTemplate.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          html_content: t.html_content,
          fields: t.fields
        }
      });
    } else {
      await prisma.certificateTemplate.create({
        data: {
          name: t.name,
          description: t.description,
          html_content: t.html_content,
          fields: t.fields
        }
      });
    }
  }
  console.log('Seeded 4 certificate templates successfully.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
