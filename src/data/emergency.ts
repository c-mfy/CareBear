// HARDCODED: emergency contacts and procedures for the demo patient.
// Phone numbers are fictional (555-01xx) placeholders, except 911 and US Poison Control.
// The procedures are a TEMPLATE: Maya's CF and GI teams must review and replace them with her real care plan.

export interface EmergencyContact {
  name: string
  role: string
  phone: string
  /** Shown as a small note, e.g. "24/7 on-call line" */
  note?: string
}

export interface EmergencyProcedure {
  id: string
  title: string
  /** Short "when to use this" line */
  when: string
  /** Signs that mean call 911 now */
  call911: string[]
  steps: string[]
  /** Who to call after (matches an EmergencyContact name) */
  thenCall?: string
}

export const patientMedicalInfo = {
  dateOfBirth: '2015-03-14', // HARDCODED placeholder
  weight: '32 kg (70 lb)', // HARDCODED placeholder
  allergies: 'No known drug allergies', // HARDCODED: confirm
  hospital: "Children's Hospital (CF Center)", // HARDCODED placeholder
  carePlanReviewed: 'Not yet reviewed by care team', // HARDCODED: set when the CF team signs off
}

export const emergencyContacts: EmergencyContact[] = [
  { name: 'Mom', role: 'Parent', phone: '(555) 010-0101' },
  { name: 'Dad', role: 'Parent', phone: '(555) 010-0102' },
  { name: 'CF Clinic', role: 'Pulmonology / CF team', phone: '(555) 010-0110', note: '24/7 on-call line after hours' },
  { name: 'GI / Feeding team', role: 'G-tube and feeds', phone: '(555) 010-0120' },
  { name: 'Pharmacy', role: 'Trikafta, albuterol, saline', phone: '(555) 010-0130' },
  { name: 'Home nursing agency', role: 'Nurse Alex', phone: '(555) 010-0140' },
  { name: 'Equipment supplier', role: 'Feeding pump, vest, nebulizer', phone: '(555) 010-0150', note: '24/7 equipment line' },
  { name: 'Poison Control', role: 'US national line', phone: '1-800-222-1222', note: 'Wrong medicine or too much medicine' },
]

export const emergencyProcedures: EmergencyProcedure[] = [
  {
    id: 'breathing',
    title: 'Trouble breathing',
    when: 'Fast or hard breathing, wheezing, or a coughing fit that will not settle.',
    call911: [
      'Lips or face look blue or gray',
      'Struggling to speak or skin pulling in between the ribs',
      'Very sleepy or hard to wake',
    ],
    steps: [
      'Sit Maya upright and stay calm with her.',
      'Stop any feed that is running.',
      'Give albuterol as her care plan directs.',
      'If she is not clearly better after the treatment, call the CF Clinic.',
    ],
    thenCall: 'CF Clinic',
  },
  {
    id: 'blood',
    title: 'Coughing up blood',
    when: 'Blood or blood-streaked mucus when coughing.',
    call911: ['More than a few streaks, or bright red blood that keeps coming'],
    steps: [
      'Keep Maya calm and sitting up.',
      'Do not start the vest or airway clearance until the CF team says it is okay.',
      'Note roughly how much blood, and when it started.',
      'Call the CF Clinic right away, even for small amounts.',
    ],
    thenCall: 'CF Clinic',
  },
  {
    id: 'gtube-out',
    title: 'G-tube button came out',
    when: 'The button is out of the stoma (the opening in her belly).',
    call911: ['Heavy bleeding from the stoma'],
    steps: [
      'Stay calm. This is urgent but common.',
      'Cover the stoma with clean gauze or a clean cloth.',
      'If you are trained, put in the spare button from the emergency kit.',
      'If not, go to the hospital right away and bring the old button and the spare. The opening can start to close within hours.',
      'Do not use the tube for feeds or medicine until it is checked.',
    ],
    thenCall: 'GI / Feeding team',
  },
  {
    id: 'pump-alarm',
    title: 'Feeding pump alarm that will not clear',
    when: 'Occlusion, "no flow," or error alarms during a feed.',
    call911: [],
    steps: [
      'Check the tubing for kinks or a closed clamp, and that the extension set is connected.',
      'Flush the tube with water as her care plan directs, then restart the pump.',
      'If it alarms again, stop the feed and note how much was infused.',
      'Log it on the pump tag so the next caregiver and the doctor see it.',
    ],
    thenCall: 'Equipment supplier',
  },
  {
    id: 'vomiting',
    title: 'Vomiting during a feed',
    when: 'Vomiting or retching while the pump is running.',
    call911: ['Trouble breathing after vomiting', 'Green or bloody vomit'],
    steps: [
      'Stop the pump right away.',
      'Sit Maya up or turn her on her side.',
      'Wait 30 to 60 minutes before restarting at the same or a slower rate, as her plan directs.',
      'If it happens again, keep the feed off and call the GI team.',
    ],
    thenCall: 'GI / Feeding team',
  },
  {
    id: 'medication',
    title: 'Missed, late, or extra medicine dose',
    when: 'A Trikafta dose was missed, given very late, or possibly given twice.',
    call911: ['Trouble breathing, swelling, or very sleepy after a dose'],
    steps: [
      'Check the app first: the Trikafta tag shows the last dose and who gave it.',
      'Do not give an extra dose to "catch up."',
      'Call the pharmacist or CF Clinic and ask what to do for this dose.',
      'If you think too much was given, call Poison Control.',
    ],
    thenCall: 'Pharmacy',
  },
  {
    id: 'fever',
    title: 'Fever or seems very unwell',
    when: 'Temperature of 101°F (38.3°C) or higher, or more tired and coughing more than usual.',
    call911: ['Hard to wake or not responding normally', 'Trouble breathing'],
    steps: [
      'Take her temperature and write down the time.',
      'Keep giving fluids and feeds as tolerated.',
      'Call the CF Clinic. People with CF often need to be seen sooner for infections.',
    ],
    thenCall: 'CF Clinic',
  },
]

/** "(555) 010-0101" -> "tel:5550100101" */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
