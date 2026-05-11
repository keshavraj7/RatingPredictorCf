import {
    RatingCalculator,
    Contestant
} from './calculator.js';

export function predictRatingChanges(participants) {

    const unique = new Map();

    for (const p of participants) {
        unique.set(p.handle, p);
    }

    const contestants =
        [...unique.values()].map(
            p => new Contestant(
                p.handle,
                p.points,
                p.penalty,
                p.rating
            )
        );

    new RatingCalculator(
        contestants
    ).calculateDeltas();

    return contestants.map(c => ({
        handle: c.handle,
        delta: c.delta,
        newRating:
            (c.rating ?? 1400) + c.delta,
        rating: c.rating,
        rank: c.rank
    }));
}
