import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/resources/en';
import { fr } from '../../src/i18n/resources/fr';

describe('translation resources', () => {
  it('keeps English and French translation keys in parity', () => {
    expect(flattenKeys(fr.translation)).toEqual(flattenKeys(en.translation));
  });
});

function flattenKeys(value: object, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, child]) => {
      const path = prefix === '' ? key : `${prefix}.${key}`;
      return typeof child === 'object' && child !== null
        ? flattenKeys(child as object, path)
        : [path];
    })
    .sort();
}
