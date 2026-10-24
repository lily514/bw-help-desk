import type { Room, Route } from './types'

/** Scripted parent questions for test mode (PLAN.md 4.5). */
export interface TestScenario {
  num: number
  question: string
  /** Maya questions come from Sam Rivera; the others from test parents created on the fly. */
  child: 'Maya' | 'Leo' | 'Ava' | 'Theo' | 'Noah'
  expected: Route
  note?: string
}

export const TEST_PARENTS: Record<
  Exclude<TestScenario['child'], 'Maya'>,
  { name: string; room: Room }
> = {
  Leo: { name: 'Jamie Chen', room: 'Preschool' },
  Ava: { name: 'Morgan Ellis', room: 'Toddlers' },
  Theo: { name: 'Riley Novak', room: 'Twos' },
  Noah: { name: 'Casey Ward', room: 'Preschool' },
}

export const TEST_SCENARIOS: TestScenario[] = [
  {
    num: 1,
    child: 'Maya',
    expected: 'answered',
    question: 'What time do you open in the morning?',
  },
  {
    num: 2,
    child: 'Maya',
    expected: 'answered',
    question: 'Are you closed the Friday after Thanksgiving?',
  },
  {
    num: 3,
    child: 'Maya',
    expected: 'looped_in',
    question: "Can my mom pick Maya up on Friday? She's not on the list.",
    note: 'Dana replies and saves the answer',
  },
  {
    num: 4,
    child: 'Maya',
    expected: 'answered',
    question: 'How much is tuition for the Twos room?',
  },
  {
    num: 5,
    child: 'Maya',
    expected: 'looped_in',
    question: 'Maya has a 100.6 fever this morning. Can she come in?',
  },
  {
    num: 6,
    child: 'Leo',
    expected: 'looped_in',
    question: 'Leo forgot his lunch today. Can someone help?',
  },
  {
    num: 7,
    child: 'Ava',
    expected: 'handed_off',
    question: "I'd like to talk about the behavior note Ava brought home.",
  },
  {
    num: 8,
    child: 'Theo',
    expected: 'handed_off',
    question: "My ex isn't allowed to pick up Theo anymore.",
  },
  {
    num: 9,
    child: 'Maya',
    expected: 'handed_off',
    question: 'I think we were double charged for September.',
  },
  {
    num: 10,
    child: 'Maya',
    expected: 'urgent',
    question: "Stuck on I-65 and won't make 6:00 pickup.",
  },
  {
    num: 11,
    child: 'Noah',
    expected: 'urgent',
    question: 'Noah may have eaten something with peanuts at a party. Is he okay?',
  },
  { num: 12, child: 'Maya', expected: 'answered', question: 'Do you provide diapers and wipes?' },
  {
    num: 13,
    child: 'Maya',
    expected: 'looped_in',
    question: 'Could we schedule a tour for my younger child?',
  },
  { num: 14, child: 'Maya', expected: 'answered', question: "What's for lunch on Wednesday?" },
  {
    num: 15,
    child: 'Maya',
    expected: 'answered',
    question: 'Can my mom pick up Maya next Friday too?',
    note: 'Only after the reply to #3 was saved as knowledge',
  },
]
