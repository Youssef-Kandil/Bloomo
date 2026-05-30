import { createAppTreasuryEntryDto, listAppTreasuryDto, summaryAppTreasuryDto } from './app-treasury.dto';

describe('app-treasury DTOs', () => {
  it('createAppTreasuryEntryDto: EXPENSE requires a category', () => {
    const ok = createAppTreasuryEntryDto.safeParse({
      kind: 'EXPENSE',
      amount: 100,
      reason: 'AWS bill',
      category: 'INFRASTRUCTURE',
    });
    expect(ok.success).toBe(true);

    const missingCat = createAppTreasuryEntryDto.safeParse({
      kind: 'EXPENSE',
      amount: 100,
      reason: 'AWS bill',
    });
    expect(missingCat.success).toBe(false);
  });

  it('createAppTreasuryEntryDto: INCOME may omit category', () => {
    const ok = createAppTreasuryEntryDto.safeParse({
      kind: 'INCOME',
      amount: 5000,
      reason: 'Manual subscription payment',
      plan: 'PRO',
    });
    expect(ok.success).toBe(true);
  });

  it('createAppTreasuryEntryDto: amount must be positive', () => {
    const zero = createAppTreasuryEntryDto.safeParse({
      kind: 'INCOME',
      amount: 0,
      reason: 'x',
    });
    expect(zero.success).toBe(false);

    const negative = createAppTreasuryEntryDto.safeParse({
      kind: 'INCOME',
      amount: -50,
      reason: 'x',
    });
    expect(negative.success).toBe(false);
  });

  it('listAppTreasuryDto: coerces from/to dates and pagination', () => {
    const parsed = listAppTreasuryDto.safeParse({
      from: '2026-01-01',
      to: '2026-05-31',
      kind: 'INCOME',
      plan: 'PRO',
      page: '2',
      pageSize: '20',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.from).toBeInstanceOf(Date);
      expect(parsed.data.to).toBeInstanceOf(Date);
      expect(parsed.data.page).toBe(2);
      expect(parsed.data.pageSize).toBe(20);
    }
  });

  it('summaryAppTreasuryDto: empty input still parses (no filters)', () => {
    const parsed = summaryAppTreasuryDto.safeParse({});
    expect(parsed.success).toBe(true);
  });
});
