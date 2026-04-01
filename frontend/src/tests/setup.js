// global setup that runs before every test file
// clears localStorage and resets all mocks so tests don't bleed into each other

import { vi } from 'vitest';

beforeEach(() => {
  // wipe localStorage between tests - auth tokens shouldn't carry over
  localStorage.clear();
  vi.clearAllMocks();
});
