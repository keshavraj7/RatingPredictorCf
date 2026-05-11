import FFTConv from '../util/conv.js';
import binarySearch from '../util/binsearch.js';


const DEFAULT_RATING = 1400;

export const MAX_RATING_LIMIT = 6000;
export const MIN_RATING_LIMIT = -500;
const RATING_RANGE_LEN =
    MAX_RATING_LIMIT - MIN_RATING_LIMIT;
const ELO_OFFSET = RATING_RANGE_LEN;
const RATING_OFFSET = -MIN_RATING_LIMIT;

const ELO_WIN_PROB =
    new Array(2 * RATING_RANGE_LEN + 1);

for (
    let i = -RATING_RANGE_LEN;
    i <= RATING_RANGE_LEN;
    i++
) {
    ELO_WIN_PROB[i + ELO_OFFSET] =
        1 / (1 + Math.pow(10, i / 400));
}

const fftConv =
    new FFTConv(
        ELO_WIN_PROB.length +
        RATING_RANGE_LEN - 1
    );

export class Contestant {

    constructor(
        handle,
        points,
        penalty,
        rating
    ) {
        this.handle = handle;
        this.points = points;
        this.penalty = penalty;
        this.rating = rating;
        this.effectiveRating =
            rating == null
                ? DEFAULT_RATING
                : rating;
        this.rank = null;
        this.delta = null;
    }
}

export class RatingCalculator {

    constructor(contestants) {
        this.contestants = contestants;
        this.seed = null;
        this.adjustment = null;
    }

    calculateDeltas() {
        this.calcSeed();
        this.reassignRanks();
        this.calcDeltas();
        this.adjustDeltas();
    }

    calcSeed() {

        const counts =
            new Array(RATING_RANGE_LEN).fill(0);

        for (const c of this.contestants) {
            counts[
                c.effectiveRating + RATING_OFFSET
            ] += 1;
        }

        this.seed =
            fftConv.convolve(ELO_WIN_PROB, counts);

        // +1 so seed represents expected rank (starts at 1)
        for (
            let i = 0;
            i < this.seed.length;
            i++
        ) {
            this.seed[i] += 1;
        }
    }

    getSeed(r, exclude) {

        return (
            this.seed[
                r + ELO_OFFSET + RATING_OFFSET
            ]
            - ELO_WIN_PROB[
                r - exclude + ELO_OFFSET
            ]
        );
    }

    reassignRanks() {

        this.contestants.sort(
            (a, b) =>
                a.points !== b.points
                    ? b.points - a.points
                    : a.penalty - b.penalty
        );

        let lastPoints, lastPenalty, rank;

        for (
            let i = this.contestants.length - 1;
            i >= 0;
            i--
        ) {
            const c = this.contestants[i];

            if (
                c.points !== lastPoints ||
                c.penalty !== lastPenalty
            ) {
                lastPoints = c.points;
                lastPenalty = c.penalty;
                rank = i + 1;
            }

            c.rank = rank;
        }
    }

    rankToRating(rank, selfRating) {

        // Finds last rating at which seed >= rank
        return binarySearch(
            2,
            MAX_RATING_LIMIT,
            rating =>
                this.getSeed(
                    rating,
                    selfRating
                ) < rank
        ) - 1;
    }

    calcDelta(contestant, assumedRating) {

        const seed =
            this.getSeed(
                assumedRating,
                contestant.effectiveRating
            );

        const midRank =
            Math.sqrt(contestant.rank * seed);

        const needRating =
            this.rankToRating(
                midRank,
                contestant.effectiveRating
            );

        return Math.trunc(
            (needRating - assumedRating) / 2
        );
    }

    calcDeltas() {

        for (const c of this.contestants) {
            c.delta =
                this.calcDelta(
                    c,
                    c.effectiveRating
                );
        }
    }

    adjustDeltas() {

        this.contestants.sort(
            (a, b) =>
                b.effectiveRating -
                a.effectiveRating
        );

        const n = this.contestants.length;

        {
            const deltaSum =
                this.contestants.reduce(
                    (a, b) => a + b.delta,
                    0
                );

            const inc =
                Math.trunc(-deltaSum / n) - 1;

            this.adjustment = inc;

            for (const c of this.contestants) {
                c.delta += inc;
            }
        }

        {
            const zeroSumCount =
                Math.min(
                    4 * Math.round(Math.sqrt(n)),
                    n
                );

            const deltaSum =
                this.contestants
                    .slice(0, zeroSumCount)
                    .reduce(
                        (a, b) => a + b.delta,
                        0
                    );

            const inc =
                Math.min(
                    Math.max(
                        Math.trunc(
                            -deltaSum / zeroSumCount
                        ),
                        -10
                    ),
                    0
                );

            this.adjustment += inc;

            for (const c of this.contestants) {
                c.delta += inc;
            }
        }
    }
}
