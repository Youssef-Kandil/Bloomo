import { haversine, type LatLng } from './geo';

export interface HistoricalRating {
  /** avg stars across any request type for the same (employee, client) pair */
  sameClientAvg: number | null;
  /** avg stars for same (employee, client, requestType) tuple */
  sameClientSameTypeAvg: number | null;
}

export interface CandidateInput {
  employeeId: string;
  employeeLocation: LatLng | null;
  /** last location update timestamp — used to decide if ping is fresh enough */
  lastPingAt: Date | null;
  history: HistoricalRating;
}

export interface ScoringContext {
  clientLocation: LatLng;
  /** minutes after which we treat the ping as stale */
  freshnessMinutes: number;
  /** circle radius within which start-task is allowed (meters) — informational only */
  startRadiusM: number;
}

export type RatingCriterion = 'none' | 'same_client' | 'same_client_same_type';

export interface RankedCandidate {
  employeeId: string;
  distanceMeters: number | null;
  distanceDisplay: string;
  distancePoints: number;
  /** 1-based position among peers by distance (1 = closest). null when ping stale. */
  distanceRank: number | null;
  ratingBonus: number;
  usedCriterion: RatingCriterion;
  withinStartRadius: boolean;
  total: number;
  isFresh: boolean;
}

const MAX_DISTANCE_POINTS = 6;
const MAX_TOTAL = 10;

/** Bucket same-client-any-type rating into points (0, 1, 2). */
function sameClientPoints(avg: number | null): number {
  if (avg === null) return 0;
  if (avg >= 5) return 2;
  if (avg >= 3) return 1;
  return 0;
}

/** Bucket same-client-same-type rating into points (0..4). */
function sameClientSameTypePoints(avg: number | null): number {
  if (avg === null) return 0;
  if (avg >= 5) return 4;
  if (avg >= 3) return 2;
  if (avg >= 2) return 1;
  return 0;
}

function pickRating(history: HistoricalRating): {
  points: number;
  criterion: RatingCriterion;
} {
  const a = sameClientPoints(history.sameClientAvg);
  const b = sameClientSameTypePoints(history.sameClientSameTypeAvg);
  if (b >= a && b > 0) return { points: b, criterion: 'same_client_same_type' };
  if (a > 0) return { points: a, criterion: 'same_client' };
  return { points: 0, criterion: 'none' };
}

/**
 * Rank candidates for a request. Distance points are awarded by RANK among
 * fresh candidates: closest = MAX_DISTANCE_POINTS, second = MAX-1, etc, down
 * to 0. Tied distances share the same rank (dense ranking — next distinct
 * distance gets the next rank, not "skip"). Stale pings get rank=null and
 * 0 points. Rating bonus is the MAX of the two criteria. Total clamped to 10.
 */
export function rankCandidates(
  candidates: CandidateInput[],
  ctx: ScoringContext,
): RankedCandidate[] {
  const now = Date.now();
  const freshnessMs = ctx.freshnessMinutes * 60_000;

  const measured = candidates.map((c) => {
    const fresh =
      c.employeeLocation !== null &&
      c.lastPingAt !== null &&
      now - c.lastPingAt.getTime() <= freshnessMs;

    const dist =
      c.employeeLocation !== null ? haversine(c.employeeLocation, ctx.clientLocation) : null;

    return { c, fresh, dist };
  });

  // Compute distance ranks (dense ranking) among fresh-with-distance candidates.
  const freshWithDist = measured
    .filter((m) => m.fresh && m.dist)
    .sort((a, b) => a.dist!.meters - b.dist!.meters);

  const rankByEmpId = new Map<string, number>();
  let currentRank = 0;
  let prevDistance = -Infinity;
  for (const m of freshWithDist) {
    if (m.dist!.meters !== prevDistance) {
      currentRank++;
      prevDistance = m.dist!.meters;
    }
    rankByEmpId.set(m.c.employeeId, currentRank);
  }

  const results: RankedCandidate[] = measured.map(({ c, fresh, dist }) => {
    const rank = rankByEmpId.get(c.employeeId) ?? null;
    const distancePoints =
      rank !== null ? Math.max(0, MAX_DISTANCE_POINTS - (rank - 1)) : 0;

    const rating = pickRating(c.history);
    const total = Math.min(MAX_TOTAL, distancePoints + rating.points);

    return {
      employeeId: c.employeeId,
      distanceMeters: dist ? dist.m : null,
      distanceDisplay: dist ? dist.display : '—',
      distancePoints: round2(distancePoints),
      distanceRank: rank,
      ratingBonus: rating.points,
      usedCriterion: rating.criterion,
      withinStartRadius: dist !== null && dist.meters <= ctx.startRadiusM,
      total: round2(total),
      isFresh: fresh,
    };
  });

  return results.sort((a, b) => b.total - a.total);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
