// system tests for IPUCommsAPI.sendEmail via our notifyApplication wrapper
// test cases 40, 43, 44, 45 from the test case doc (sendEmail section)
// ipos-pu exposes sendEmail(email, body, subject) - we wrap it as notifyApplication
// so we can pass in the outcome and let the wrapper handle the formatting
// apiClient is mocked because we cant actually run ipos-pu in tests
// sequential numbering (79-82) tracks position in the full 1-82 suite

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '../../frontend/src/services/apiClient';
import { notifyApplication } from '../../frontend/src/services/notificationService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('IPUCommsAPI.notifyApplication', () => {

  // test case 40 (suite: 79) - all valid values, should succeed
  it('79: valid email and outcome sends email and returns true', async () => {
    apiClient.post.mockResolvedValueOnce({ sent: true });

    const result = await notifyApplication(
      'applicant@testpharmacy.com',
      'SC123456',
      'approved',
    );

    expect(result).toBe(true);
    expect(apiClient.post).toHaveBeenCalledTimes(1);

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.email).toBe('applicant@testpharmacy.com');
    expect(payload.subject.toLowerCase()).toContain('approved');
    expect(payload.body).toContain('SC123456');
  });

  // test case 43 (suite: 80) - pending is not a terminal state so nothing to send
  // wrapper returns false before calling sendEmail
  it('80: pending outcome means no subject is generated, returns false without calling sendEmail', async () => {
    const result = await notifyApplication(
      'applicant@testpharmacy.com',
      'SC123456',
      'pending',
    );

    expect(result).toBe(false);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  // test case 44 (suite: 81) - ipos-pu completely unavailable
  // attempt is made but connection fails so email never arrives
  it('81: ipos-pu unavailable means email never sent, returns false without crashing', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await notifyApplication(
      'applicant@testpharmacy.com',
      'SC123456',
      'rejected',
    );

    expect(result).toBe(false);
    // still tried to call it
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  // test case 45 (suite: 82) - completely invalid input, empty email and invalid outcome
  // nothing valid to send so returns false without calling sendEmail at all
  it('82: empty email and invalid outcome, completely invalid, returns false without calling sendEmail', async () => {
    const result = await notifyApplication(
      '',
      '',
      'pending',
    );

    expect(result).toBe(false);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

});
