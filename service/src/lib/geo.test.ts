import { formatDistance, haversine } from './geo';

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    const d = haversine({ lat: 30, lng: 31 }, { lat: 30, lng: 31 });
    expect(d.meters).toBe(0);
    expect(d.m).toBe(0);
    expect(d.km).toBe(0);
  });

  it('measures ~111km for one degree of latitude', () => {
    const d = haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d.km).toBeGreaterThan(110);
    expect(d.km).toBeLessThan(112);
  });

  it('is symmetric', () => {
    const a = { lat: 30.0444, lng: 31.2357 };
    const b = { lat: 31.2001, lng: 29.9187 };
    expect(haversine(a, b).meters).toBeCloseTo(haversine(b, a).meters, 5);
  });

  it('produces a sensible display string', () => {
    const close = haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 });
    expect(close.display).toMatch(/m$/);
    const far = haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(far.display).toMatch(/km$/);
  });
});

describe('formatDistance', () => {
  it('formats sub-kilometer distances in meters', () => {
    expect(formatDistance(340)).toBe('340 m');
  });
  it('formats >=1km distances in km with 2 decimals when small', () => {
    expect(formatDistance(1234)).toBe('1.23 km');
  });
  it('formats large distances with one decimal', () => {
    expect(formatDistance(12345)).toBe('12.3 km');
  });
});
