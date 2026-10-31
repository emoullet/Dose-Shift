export const associativeMemoryStimulusCatalogVersion = 'local-object-pictograms-1';

export const associativeMemoryStimulusIds = [
  'apple',
  'banana',
  'bicycle',
  'book',
  'bottle',
  'camera',
  'candle',
  'car',
  'chair',
  'clock',
  'cloud',
  'cup',
  'envelope',
  'fish',
  'flower',
  'fork',
  'glasses',
  'guitar',
  'hammer',
  'hat',
  'house',
  'key',
  'lamp',
  'leaf',
  'moon',
  'mug',
  'pencil',
  'phone',
  'plane',
  'scissors',
  'shoe',
  'spoon',
  'star',
  'suitcase',
  'sun',
  'train',
  'tree',
  'umbrella',
  'watch',
  'wrench'
] as const;

export type AssociativeMemoryStimulusId = typeof associativeMemoryStimulusIds[number];

export function associativeMemoryStimulusPath(id: AssociativeMemoryStimulusId): string {
  return `/stimuli/associative-memory/${associativeMemoryStimulusCatalogVersion}/${id}.svg`;
}
