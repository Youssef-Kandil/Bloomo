import { rankCandidates, type CandidateInput } from './scoring';

const baseCtx = {
  clientLocation: { lat: 30.0, lng: 31.0 },
  freshnessMinutes: 5,
  startRadiusM: 200,
};

const fresh = (overrides: Partial<CandidateInput> = {}): CandidateInput => ({
  employeeId: 'e1',
  employeeLocation: { lat: 30.0, lng: 31.0 },
  lastPingAt: new Date(),
  history: { sameClientAvg: null, sameClientSameTypeAvg: null },
  ...overrides,
});

describe('rankCandidates', () => {
  it('returns 0 when ping is stale', () => {
    const stale = fresh({
      lastPingAt: new Date(Date.now() - 30 * 60_000),
    });
    const [r] = rankCandidates([stale], baseCtx);
    expect(r.distancePoints).toBe(0);
    expect(r.isFresh).toBe(false);
    expect(r.total).toBe(0);
  });

  it('gives single fresh candidate the full 6 distance points', () => {
    const [r] = rankCandidates([fresh()], baseCtx);
    expect(r.distancePoints).toBe(6);
    expect(r.total).toBeGreaterThanOrEqual(6);
  });

  it('awards rank-based distance points: closest=6, next=5, next=4 …', () => {
    const close = fresh({ employeeId: 'close', employeeLocation: { lat: 30.0, lng: 31.0 } });
    const mid = fresh({ employeeId: 'mid', employeeLocation: { lat: 30.005, lng: 31.005 } });
    const far = fresh({ employeeId: 'far', employeeLocation: { lat: 30.05, lng: 31.05 } });
    const ranked = rankCandidates([far, mid, close], baseCtx);
    const byId = Object.fromEntries(ranked.map((r) => [r.employeeId, r]));
    expect(byId.close.distancePoints).toBe(6);
    expect(byId.close.distanceRank).toBe(1);
    expect(byId.mid.distancePoints).toBe(5);
    expect(byId.mid.distanceRank).toBe(2);
    expect(byId.far.distancePoints).toBe(4);
    expect(byId.far.distanceRank).toBe(3);
  });

  it('shares rank for tied distances (dense ranking)', () => {
    const a = fresh({ employeeId: 'a', employeeLocation: { lat: 30.0, lng: 31.0 } });
    const b = fresh({ employeeId: 'b', employeeLocation: { lat: 30.0, lng: 31.0 } });
    const c = fresh({ employeeId: 'c', employeeLocation: { lat: 30.05, lng: 31.05 } });
    const ranked = rankCandidates([a, b, c], baseCtx);
    const byId = Object.fromEntries(ranked.map((r) => [r.employeeId, r]));
    expect(byId.a.distanceRank).toBe(1);
    expect(byId.b.distanceRank).toBe(1);
    expect(byId.c.distanceRank).toBe(2);
    expect(byId.a.distancePoints).toBe(6);
    expect(byId.b.distancePoints).toBe(6);
    expect(byId.c.distancePoints).toBe(5);
  });

  it('caps distance points at 0 when more than 6 ranks deep', () => {
    const cands = Array.from({ length: 9 }, (_, i) =>
      fresh({
        employeeId: `e${i}`,
        employeeLocation: { lat: 30.0 + i * 0.01, lng: 31.0 },
      }),
    );
    const ranked = rankCandidates(cands, baseCtx);
    const byId = Object.fromEntries(ranked.map((r) => [r.employeeId, r]));
    expect(byId.e0.distancePoints).toBe(6); // rank 1
    expect(byId.e5.distancePoints).toBe(1); // rank 6
    expect(byId.e6.distancePoints).toBe(0); // rank 7+
    expect(byId.e8.distancePoints).toBe(0); // rank 9
  });

  it('uses MAX rule between same-client and same-client-same-type bonuses', () => {
    const c = fresh({
      history: { sameClientAvg: 5, sameClientSameTypeAvg: 3.5 },
    });
    const [r] = rankCandidates([c], baseCtx);
    // sameClientAvg=5 → 2 pts; sameType avg 3.5 → 2 pts. MAX = 2.
    // Tie-break prefers same_client_same_type when b >= a and b > 0.
    expect(r.ratingBonus).toBe(2);
    expect(['same_client', 'same_client_same_type']).toContain(r.usedCriterion);
  });

  it('caps total at 10', () => {
    const c = fresh({ history: { sameClientAvg: null, sameClientSameTypeAvg: 5 } });
    const [r] = rankCandidates([c], baseCtx);
    expect(r.ratingBonus).toBe(4);
    expect(r.total).toBeLessThanOrEqual(10);
  });

  it('marks within/out start radius correctly without affecting score', () => {
    const inside = fresh({
      employeeId: 'inside',
      employeeLocation: { lat: 30.0, lng: 31.001 }, // ~96m east
    });
    const outside = fresh({
      employeeId: 'outside',
      employeeLocation: { lat: 30.01, lng: 31.0 }, // ~1.1km north
    });
    const ranked = rankCandidates([inside, outside], baseCtx);
    const byId = Object.fromEntries(ranked.map((r) => [r.employeeId, r]));
    expect(byId.inside.withinStartRadius).toBe(true);
    expect(byId.outside.withinStartRadius).toBe(false);
  });

  it('sorts results by total descending', () => {
    const a = fresh({ employeeId: 'a', employeeLocation: { lat: 30.0, lng: 31.0 } });
    const b = fresh({
      employeeId: 'b',
      employeeLocation: { lat: 30.05, lng: 31.05 },
      history: { sameClientAvg: null, sameClientSameTypeAvg: 5 },
    });
    const ranked = rankCandidates([a, b], baseCtx);
    expect(ranked[0].total).toBeGreaterThanOrEqual(ranked[1].total);
  });
});
