import type { Category, Parent, Room } from '../../shared/types'

/** Synthetic history (PLAN.md 2.2) so Insights and the Inbox aren't empty on first load. */

export const DEMO_PARENT: Omit<Parent, 'createdAt'> = {
  id: 'sam-rivera',
  name: 'Sam Rivera',
  childName: 'Maya',
  room: 'Twos',
  isDemo: false,
  isTest: false,
}

export const HISTORY_PARENTS: { id: string; name: string; childName: string; room: Room }[] = [
  { id: 'priya-shah', name: 'Priya Shah', childName: 'Jonah', room: 'Toddlers' },
  { id: 'marcus-bell', name: 'Marcus Bell', childName: 'Emma', room: 'Preschool' },
  { id: 'elena-torres', name: 'Elena Torres', childName: 'Lucas', room: 'Infants' },
  { id: 'chris-okafor', name: 'Chris Okafor', childName: 'Zoe', room: 'Twos' },
  { id: 'hannah-lee', name: 'Hannah Lee', childName: 'Owen', room: 'Preschool' },
  { id: 'dev-patel', name: 'Dev Patel', childName: 'Mila', room: 'Toddlers' },
  { id: 'taylor-brooks', name: 'Taylor Brooks', childName: 'Ellie', room: 'Infants' },
]

/**
 * answered:     factual, covered by the KB
 * health:       looped in, about the child's health today
 * staff_action: looped in, staff need to do something
 * sensitive:    handed off, needs Dana
 * uncovered:    handed off, the KB doesn't cover it (answerable = 0)
 */
export type SeedKind = 'answered' | 'health' | 'staff_action' | 'sensitive' | 'uncovered'

export interface SeedQuestion {
  parentId: string
  daysAgo: number
  /** Local Eastern time, 24h "HH:MM". */
  time: string
  kind: SeedKind
  topic: Category
  question: string
  /** AI answer for answered / looped-in questions. */
  answer?: string
  citations?: string[]
  /** Dana's reply for escalated questions (all seeded escalations are already replied). */
  staffReply?: string
  /** Overrides the default reason for sensitive questions. */
  reason?: string
}

const UNCOVERED_REPLIES: Record<string, string> = {
  'Do you offer swim lessons?':
    "Not right now. Our on-site electives are karate, soccer and gymnastics. I'll let you know if we add swimming.",
  'Is there a photo day this fall?':
    "Yes, we're planning one for mid-November. I'll send the date to families once it's confirmed.",
  'Where should I park at pickup?':
    'The short-term spots right by the front door are best for pickup. Please avoid the fire lane.',
  'Can kids wear Halloween costumes?':
    'Yes, costumes are welcome on Halloween. Please skip masks and pretend weapons.',
}

export const SEED_QUESTIONS: SeedQuestion[] = [
  // Answered by AI
  {
    parentId: 'elena-torres',
    daysAgo: 6,
    time: '07:12',
    kind: 'answered',
    topic: 'Hours',
    question: 'What time does the infant room open?',
    answer:
      'The infant room is open 7:30am to 5:30pm, Monday through Friday. The rest of the center opens at 6:30am.',
    citations: ['hours:regular'],
  },
  {
    parentId: 'marcus-bell',
    daysAgo: 6,
    time: '12:40',
    kind: 'answered',
    topic: 'Hours',
    question: 'Are you open on Veterans Day?',
    answer:
      "Yes, we're open on Veterans Day. It isn't one of our holiday closures, so Emma's day runs as usual.",
    citations: ['hours:holidays'],
  },
  {
    parentId: 'dev-patel',
    daysAgo: 5,
    time: '08:05',
    kind: 'answered',
    topic: 'Hours',
    question: 'Do you close for snow days?',
    answer:
      "Only when conditions are severe and it isn't safe for staff to travel. If we close before opening, you'll hear through the emergency notification system, family email and our Facebook page, so keep your email and cell number current.",
    citations: ['hours:weather'],
  },
  {
    parentId: 'hannah-lee',
    daysAgo: 5,
    time: '13:22',
    kind: 'answered',
    topic: 'Fees',
    question: 'How much is tuition for preschool?',
    answer:
      'Full-time preschool tuition is $245 a week. Tuition is due Mondays for the current week, and you can pay weekly, biweekly or monthly as long as it is in advance.',
    citations: ['fees:tuition'],
  },
  {
    parentId: 'priya-shah',
    daysAgo: 5,
    time: '16:48',
    kind: 'answered',
    topic: 'Fees',
    question: 'Is there a sibling discount?',
    answer:
      "Yes. When two or more children are enrolled full-time, you get 10% off the oldest child's tuition. It doesn't apply if the second child is only in summer, school-age or holiday-break care.",
    citations: ['fees:tuition'],
  },
  {
    parentId: 'chris-okafor',
    daysAgo: 4,
    time: '09:30',
    kind: 'answered',
    topic: 'Fees',
    question: 'How much is the late pickup fee?',
    answer:
      'Pickup is by 6:00pm. A first late pickup is $10 plus $1 a minute after the first 10 minutes; a second is $20 plus $1 a minute. If something comes up, call ahead so we know.',
    citations: ['fees:late_pickup'],
  },
  {
    parentId: 'taylor-brooks',
    daysAgo: 4,
    time: '11:15',
    kind: 'answered',
    topic: 'Fees',
    question: 'How do vacation weeks work?',
    answer:
      "You can take up to two vacation weeks a year at half tuition, which holds Ellie's spot. The first week is available after 6 months of enrollment and the second after a year. Vacation fees are paid before the absence.",
    citations: ['fees:vacation'],
  },
  {
    parentId: 'dev-patel',
    daysAgo: 4,
    time: '14:02',
    kind: 'answered',
    topic: 'Fees',
    question: 'What is the registration fee?',
    answer:
      "There's a one-time, non-refundable $40 registration fee that goes toward classroom supplies. To hold a spot, it's paid with a deposit of one week's tuition.",
    citations: ['fees:enrollment'],
  },
  {
    parentId: 'hannah-lee',
    daysAgo: 3,
    time: '07:55',
    kind: 'answered',
    topic: 'Meals',
    question: "What's for lunch on Thursday?",
    answer:
      "Thursday's lunch is turkey chili with cornbread and mixed fruit. There's a vegetarian alternative too.",
    citations: ['meals:menu'],
  },
  {
    parentId: 'marcus-bell',
    daysAgo: 3,
    time: '10:10',
    kind: 'answered',
    topic: 'Meals',
    question: 'Can we bring cupcakes for a birthday?',
    answer:
      "Yes, with a little planning. Check with Emma's teacher first. Treats need to be store-bought, in unopened packages and nut-free, and it's worth asking about other allergies in the room.",
    citations: ['meals:celebrations'],
  },
  {
    parentId: 'elena-torres',
    daysAgo: 3,
    time: '15:31',
    kind: 'answered',
    topic: 'Meals',
    question: 'What time is breakfast?',
    answer:
      'Breakfast is at 8:20am, lunch at 11:20am and afternoon snack at 2:30pm. All meals are made on-site and included in tuition.',
    citations: ['meals:schedule'],
  },
  {
    parentId: 'chris-okafor',
    daysAgo: 3,
    time: '17:05',
    kind: 'answered',
    topic: 'Health',
    question: 'Can I send sunscreen with Zoe?',
    answer:
      "Yes, but in Indiana sunscreen counts as medication, so we need a written doctor's order for it. Label the bottle with Zoe's name.",
    citations: ['health:medication'],
  },
  {
    parentId: 'priya-shah',
    daysAgo: 2,
    time: '08:20',
    kind: 'answered',
    topic: 'Health',
    question: 'At what temperature does my child have to stay home?',
    answer:
      'A fever of 101°F or higher means staying home. Diarrhea, vomiting, an unexplained rash, or not being able to join normal activities also mean a day at home. Please call the center if Jonah will be out sick.',
    citations: ['health:illness'],
  },
  {
    parentId: 'hannah-lee',
    daysAgo: 2,
    time: '12:12',
    kind: 'answered',
    topic: 'Health',
    question: 'Does Owen need to be potty trained for the Threes room?',
    answer:
      'Yes, children need to be toilet trained before moving to the Threes room, with exceptions for special needs. Staff help all the Twos with toilet training along the way.',
    citations: ['health:toilet'],
  },
  {
    parentId: 'taylor-brooks',
    daysAgo: 2,
    time: '16:40',
    kind: 'answered',
    topic: 'Pickup',
    question: 'Who is allowed to pick up my daughter?',
    answer:
      "Only adults on Ellie's authorized pickup list. They need to be 18 or older and may be asked for a photo ID.",
    citations: ['pickup:signin'],
  },
  {
    parentId: 'dev-patel',
    daysAgo: 2,
    time: '18:02',
    kind: 'answered',
    topic: 'Pickup',
    question: 'How many emergency contacts do I need?',
    answer:
      'At least two, in writing, with their names, addresses and phone numbers. Please keep your own contact info current too.',
    citations: ['pickup:emergency_contacts'],
  },
  {
    parentId: 'elena-torres',
    daysAgo: 1,
    time: '07:40',
    kind: 'answered',
    topic: 'Program',
    question: 'What should I pack for the first day?',
    answer:
      "Diapers and wipes in unopened packages labeled with Lucas's name, at least one weather-appropriate change of clothes, and a box of tissues and a box of wipes each month. A favorite cuddly toy for naptime is welcome.",
    citations: ['daily:supplies'],
  },
  {
    parentId: 'marcus-bell',
    daysAgo: 1,
    time: '11:48',
    kind: 'answered',
    topic: 'Program',
    question: 'How much screen time do the kids get?',
    answer:
      "For Emma's age, at most 30 minutes a week, always educational, ad-free and tied to the lesson, with another activity offered. Screen time is never used as a reward.",
    citations: ['program:screen_time'],
  },
  {
    parentId: 'chris-okafor',
    daysAgo: 1,
    time: '13:35',
    kind: 'answered',
    topic: 'Program',
    question: 'When are parent-teacher conferences?',
    answer:
      "Conferences and assessments happen in June each year, and you can ask for a conference any time you'd like to talk.",
    citations: ['program:curriculum'],
  },
  {
    parentId: 'priya-shah',
    daysAgo: 1,
    time: '15:20',
    kind: 'answered',
    topic: 'Policies',
    question: 'Can I visit Jonah during the day?',
    answer: "Yes, you're welcome to visit Jonah any time during the day.",
    citations: ['policy:visits_concerns'],
  },
  {
    parentId: 'taylor-brooks',
    daysAgo: 1,
    time: '17:10',
    kind: 'answered',
    topic: 'Policies',
    question: 'How many babies does each infant teacher care for?',
    answer:
      'Each infant teacher cares for at most 4 babies. Infant teachers are also Safe Sleep certified.',
    citations: ['ratios:staff'],
  },

  // Looped in, replied
  {
    parentId: 'priya-shah',
    daysAgo: 4,
    time: '07:05',
    kind: 'health',
    topic: 'Health',
    question: 'Jonah has a runny nose and a little cough today. Is it okay to bring him in?',
    answer:
      "A runny nose and cough on their own aren't on the list that keeps a child home, which is a fever of 101°F or higher, diarrhea, vomiting, an unexplained rash, or not being able to join normal activities. I've let the front desk know so they can keep an eye on him.",
    citations: ['health:illness'],
    staffReply:
      "Thanks for the heads up, Priya. He's fine to come in. We'll keep an eye on him and call you if anything changes.",
  },
  {
    parentId: 'dev-patel',
    daysAgo: 3,
    time: '09:45',
    kind: 'staff_action',
    topic: 'Program',
    question: 'Could we schedule a tour for my sister? She is looking for infant care.',
    answer:
      "Tours run Tuesday through Thursday at 9:30am and 3:30pm and take about 30 minutes. I've passed this to the front desk, and they'll confirm a time within one business day.",
    citations: ['enroll:process'],
    staffReply: "We'd love to meet her. I've put her down for Wednesday at 9:30am. See you then!",
  },

  // Handed off (sensitive), replied
  {
    parentId: 'marcus-bell',
    daysAgo: 2,
    time: '17:50',
    kind: 'sensitive',
    topic: 'Program',
    reason: "About another child's behavior",
    question: 'Emma came home with a bite mark again. I want to talk about what is going on.',
    staffReply:
      "I'm sorry, Marcus. I'd like to talk this through in person. Could you stop by my office at pickup tomorrow?",
  },
  {
    parentId: 'chris-okafor',
    daysAgo: 1,
    time: '10:25',
    kind: 'sensitive',
    topic: 'Fees',
    reason: 'Possible billing dispute',
    question: 'We were charged a late fee last week but I signed Zoe out at 5:58.',
    staffReply:
      "You're right, the sign-out sheet shows 5:58. I've removed the fee and it'll show on next week's statement.",
  },

  // Not covered by the KB (the "Couldn't answer" list)
  ...uncovered('Do you offer swim lessons?', 'Program', [
    ['hannah-lee', 6, '10:30'],
    ['priya-shah', 4, '13:10'],
    ['taylor-brooks', 2, '09:05'],
  ]),
  ...uncovered('Is there a photo day this fall?', 'Program', [
    ['marcus-bell', 5, '08:40'],
    ['elena-torres', 2, '14:15'],
  ]),
  ...uncovered('Where should I park at pickup?', 'Pickup', [
    ['dev-patel', 6, '17:20'],
    ['chris-okafor', 3, '17:35'],
  ]),
  ...uncovered('Can kids wear Halloween costumes?', 'Program', [['hannah-lee', 1, '08:15']]),
]

function uncovered(
  question: string,
  topic: Category,
  askers: [parentId: string, daysAgo: number, time: string][],
): SeedQuestion[] {
  return askers.map(([parentId, daysAgo, time]) => ({
    parentId,
    daysAgo,
    time,
    kind: 'uncovered',
    topic,
    question,
    staffReply: UNCOVERED_REPLIES[question],
  }))
}
