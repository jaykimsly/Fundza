import { Subject, Topic } from '@/types';

export const subjects: Subject[] = [
  { id: '1', name: 'Mathematical Literacy', code: 'MATH_LIT', currentPercentage: 40, targetPercentage: 80, priority: 'critical', color: '#dc2626' },
  { id: '2', name: 'Life Orientation', code: 'LIFE_ORI', currentPercentage: 40, targetPercentage: 80, priority: 'critical', color: '#ea580c' },
  { id: '3', name: 'English FAL', code: 'ENG', currentPercentage: 63, targetPercentage: 70, priority: 'high', color: '#0891b2' },
  { id: '4', name: 'SiSwati HL', code: 'SISWATI', currentPercentage: 73, targetPercentage: 80, priority: 'high', color: '#4f46e5' },
  { id: '5', name: 'Business Studies', code: 'BUS', currentPercentage: 62, targetPercentage: 70, priority: 'medium', color: '#059669' },
  { id: '6', name: 'Economics', code: 'ECON', currentPercentage: 53, targetPercentage: 65, priority: 'medium', color: '#2563eb' },
  { id: '7', name: 'Tourism', code: 'TOUR', currentPercentage: 56, targetPercentage: 65, priority: 'medium', color: '#9333ea' },
];

// NSC Level mapping
export function getLevel(percentage: number): number {
  if (percentage >= 80) return 7;
  if (percentage >= 70) return 6;
  if (percentage >= 60) return 5;
  if (percentage >= 50) return 4;
  if (percentage >= 40) return 3;
  if (percentage >= 30) return 2;
  return 1;
}

// UJ/UP APS (6 subjects, LO excluded)
export function calculateApsStandard(subjects: Subject[]): number {
  return subjects
    .filter(s => s.code !== 'LIFE_ORI')
    .reduce((sum, s) => sum + getLevel(s.currentPercentage), 0);
}

export function calculateApsStandardTarget(subjects: Subject[]): number {
  return subjects
    .filter(s => s.code !== 'LIFE_ORI')
    .reduce((sum, s) => sum + getLevel(s.targetPercentage), 0);
}

// Wits APS (best 7 including LO, 8-point scale, +2 bonus for English at 60%+)
export function calculateApsWits(subjects: Subject[]): number {
  const subMap = new Map(subjects.map(s => [s.code, s.currentPercentage]));
  
  const english = subMap.get('ENG') || 0;
  const mathsLit = subMap.get('MATH_LIT') || 0;
  const lo = subMap.get('LIFE_ORI') || 0;
  const siswati = subMap.get('SISWATI') || 0;
  const business = subMap.get('BUS') || 0;
  const economics = subMap.get('ECON') || 0;
  const tourism = subMap.get('TOUR') || 0;
  
  const witsPoints = (mark: number) => {
    if (mark >= 90) return 8;
    if (mark >= 80) return 7;
    if (mark >= 70) return 6;
    if (mark >= 60) return 5;
    if (mark >= 50) return 4;
    if (mark >= 40) return 3;
    return 0;
  };
  
  const loPoints = (mark: number) => {
    if (mark >= 90) return 4;
    if (mark >= 80) return 3;
    if (mark >= 70) return 2;
    if (mark >= 60) return 1;
    return 0;
  };
  
  const englishPts = witsPoints(english) + (english >= 60 ? 2 : 0);
  const mathsPts = witsPoints(mathsLit); // Math Lit gets no bonus
  const loPt = loPoints(lo);
  const otherPts = [siswati, business, economics, tourism].map(witsPoints).sort((a, b) => b - a);
  
  return englishPts + mathsPts + loPt + otherPts[0] + otherPts[1] + otherPts[2];
}

export const mathLitTopics: Topic[] = [
  { id: 't1', subject_id: '1', name: 'Income', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 30 },
  { id: 't2', subject_id: '1', name: 'Expenditure', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 25 },
  { id: 't3', subject_id: '1', name: 'Profit & Loss', paper: 'Paper 1', masteryLevel: 'developing', masteryPercentage: 45 },
  { id: 't4', subject_id: '1', name: 'Simple Interest', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 35 },
  { id: 't5', subject_id: '1', name: 'Compound Interest', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 20 },
  { id: 't6', subject_id: '1', name: 'Loans', paper: 'Paper 1', masteryLevel: 'developing', masteryPercentage: 50 },
  { id: 't7', subject_id: '1', name: 'Investments', paper: 'Paper 1', masteryLevel: 'almost-there', masteryPercentage: 70 },
  { id: 't8', subject_id: '1', name: 'Inflation', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 30 },
  { id: 't9', subject_id: '1', name: 'Taxation', paper: 'Paper 1', masteryLevel: 'developing', masteryPercentage: 55 },
  { id: 't10', subject_id: '1', name: 'Exchange Rates', paper: 'Paper 1', masteryLevel: 'almost-there', masteryPercentage: 65 },
  { id: 't11', subject_id: '1', name: 'Data Collection', paper: 'Paper 1', masteryLevel: 'developing', masteryPercentage: 50 },
  { id: 't12', subject_id: '1', name: 'Classification', paper: 'Paper 1', masteryLevel: 'mastered', masteryPercentage: 85 },
  { id: 't13', subject_id: '1', name: 'Mean', paper: 'Paper 1', masteryLevel: 'almost-there', masteryPercentage: 72 },
  { id: 't14', subject_id: '1', name: 'Median', paper: 'Paper 1', masteryLevel: 'almost-there', masteryPercentage: 68 },
  { id: 't15', subject_id: '1', name: 'Mode', paper: 'Paper 1', masteryLevel: 'mastered', masteryPercentage: 90 },
  { id: 't16', subject_id: '1', name: 'Range', paper: 'Paper 1', masteryLevel: 'almost-there', masteryPercentage: 75 },
  { id: 't17', subject_id: '1', name: 'Quartiles', paper: 'Paper 1', masteryLevel: 'developing', masteryPercentage: 45 },
  { id: 't18', subject_id: '1', name: 'Percentiles', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 30 },
  { id: 't19', subject_id: '1', name: 'Graphs', paper: 'Paper 1', masteryLevel: 'developing', masteryPercentage: 55 },
  { id: 't20', subject_id: '1', name: 'Histograms', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 35 },
  { id: 't21', subject_id: '1', name: 'Box-and-Whisker', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 25 },
  { id: 't22', subject_id: '1', name: 'Probability', paper: 'Paper 1', masteryLevel: 'not-mastered', masteryPercentage: 35 },
  { id: 't23', subject_id: '1', name: 'Unit Conversion', paper: 'Paper 2', masteryLevel: 'almost-there', masteryPercentage: 70 },
  { id: 't24', subject_id: '1', name: 'Length', paper: 'Paper 2', masteryLevel: 'almost-there', masteryPercentage: 65 },
  { id: 't25', subject_id: '1', name: 'Area', paper: 'Paper 2', masteryLevel: 'developing', masteryPercentage: 55 },
  { id: 't26', subject_id: '1', name: 'Perimeter', paper: 'Paper 2', masteryLevel: 'almost-there', masteryPercentage: 72 },
  { id: 't27', subject_id: '1', name: 'Volume', paper: 'Paper 2', masteryLevel: 'developing', masteryPercentage: 50 },
  { id: 't28', subject_id: '1', name: 'Surface Area', paper: 'Paper 2', masteryLevel: 'not-mastered', masteryPercentage: 40 },
  { id: 't29', subject_id: '1', name: 'Time', paper: 'Paper 2', masteryLevel: 'mastered', masteryPercentage: 85 },
  { id: 't30', subject_id: '1', name: 'Temperature', paper: 'Paper 2', masteryLevel: 'mastered', masteryPercentage: 88 },
  { id: 't31', subject_id: '1', name: 'Scale', paper: 'Paper 2', masteryLevel: 'developing', masteryPercentage: 48 },
  { id: 't32', subject_id: '1', name: 'Distance', paper: 'Paper 2', masteryLevel: 'developing', masteryPercentage: 52 },
  { id: 't33', subject_id: '1', name: 'Directions', paper: 'Paper 2', masteryLevel: 'almost-there', masteryPercentage: 68 },
  { id: 't34', subject_id: '1', name: 'Floor Plans', paper: 'Paper 2', masteryLevel: 'not-mastered', masteryPercentage: 30 },
  { id: 't35', subject_id: '1', name: 'Models', paper: 'Paper 2', masteryLevel: 'not-mastered', masteryPercentage: 25 },
  { id: 't36', subject_id: '1', name: 'Blueprints', paper: 'Paper 2', masteryLevel: 'not-mastered', masteryPercentage: 20 },
];
