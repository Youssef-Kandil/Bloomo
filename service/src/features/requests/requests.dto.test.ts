/**
 * Validates the DTO change that made `clientId` optional so client-account
 * users can post a request without knowing their own client id (the server
 * derives it from `accountUserId`). Staff callers still need it — that's
 * enforced in the service layer, not the DTO.
 */
import { createRequestDto } from './requests.dto';

describe('createRequestDto', () => {
  it('accepts a client-account payload without clientId', () => {
    const result = createRequestDto.safeParse({ type: 'MAINTENANCE', note: 'AC broken' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.clientId).toBeUndefined();
  });

  it('accepts a staff payload with clientId', () => {
    const result = createRequestDto.safeParse({
      clientId: 'cln_123',
      type: 'REPAIR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown request type', () => {
    const result = createRequestDto.safeParse({ type: 'NOT_A_TYPE' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty clientId when provided', () => {
    const result = createRequestDto.safeParse({ clientId: '', type: 'MAINTENANCE' });
    expect(result.success).toBe(false);
  });
});
