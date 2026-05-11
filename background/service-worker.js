import { Api } from '../api/apiCf.js';
import { predictRatingChanges } from '../rating/predictor.js';

const api =
    new Api();

chrome.runtime.onMessage.addListener(
    async (
        message,
        sender,
        sendResponse
    ) => {

        if (
            message.type !==
            'GET_PREDICTIONS'
        ) {

            return;
        }

        try {

            console.log(
                '======================================'
            );

            console.log(
                '[CF Predictor] START'
            );

            console.log(
                '[CF Predictor] Contest ID:',
                message.contestId
            );

            console.log(
                '[API CALL] contest.standings'
            );

            const standings =
                await api.contestStandings(
                    Number(
                        message.contestId
                    )
                );

            console.log(
                '[API SUCCESS] contest.standings'
            );

            const rows =
                standings.rows;

            console.log(
                '[CF Predictor] Total rows:',
                rows.length
            );

            const handles =
                [...new Set(

                    rows
                        .filter(
                            row =>

                                row.party
                                &&
                                row.party.members
                                &&
                                row.party.members.length
                        )
                        .map(
                            row =>
                                row.party.members[0]
                                    ?.handle
                        )
                        .filter(Boolean)
                )];

            console.log(
                '[CF Predictor] Unique handles:',
                handles.length
            );

            const ratingsMap = {};

            const CHUNK_SIZE = 500;

            const MAX_PARALLEL = 5;

            const chunks = [];

            for (
                let i = 0;
                i < handles.length;
                i += CHUNK_SIZE
            ) {

                chunks.push(

                    handles.slice(
                        i,
                        i + CHUNK_SIZE
                    )
                );
            }

            console.log(
                '[CF Predictor] Total chunks:',
                chunks.length
            );

            async function fetchChunk(
                chunk,
                retries = 3
            ) {

                for (
                    let attempt = 1;
                    attempt <= retries;
                    attempt++
                ) {

                    try {

                        console.log(
                            `[API CALL] user.info | chunkSize=${chunk.length} | attempt=${attempt}`
                        );

                        const start =
                            performance.now();

                        const users =
                            await api.userInfo(
                                chunk
                            );

                        const end =
                            performance.now();

                        console.log(
                            `[API SUCCESS] user.info | users=${users.length} | time=${Math.round(end - start)}ms`
                        );

                        return users;

                    } catch (err) {

                        console.warn(
                            `[API FAILED] user.info | attempt=${attempt}`,
                            err
                        );

                        if (
                            attempt === retries
                        ) {

                            console.error(
                                '[Chunk Aborted]'
                            );

                            return [];
                        }

                        console.log(
                            `[Retrying] waiting ${attempt}s`
                        );

                        await new Promise(
                            r =>
                                setTimeout(
                                    r,
                                    attempt * 1000
                                )
                        );
                    }
                }

                return [];
            }

            for (
                let i = 0;
                i < chunks.length;
                i += MAX_PARALLEL
            ) {

                const batch =
                    chunks.slice(
                        i,
                        i + MAX_PARALLEL
                    );

                console.log(
                    `======================================`
                );

                console.log(
                    `[BATCH START] ${Math.floor(i / MAX_PARALLEL) + 1}`
                );

                console.log(
                    `[BATCH INFO] parallel=${batch.length}`
                );

                const batchStart =
                    performance.now();

                const results =
                    await Promise.all(

                        batch.map(
                            chunk =>
                                fetchChunk(
                                    chunk
                                )
                        )
                    );

                const batchEnd =
                    performance.now();

                console.log(
                    `[BATCH DONE] time=${Math.round(batchEnd - batchStart)}ms`
                );

                for (
                    const users
                    of results
                ) {

                    for (
                        const user
                        of users
                    ) {

                        ratingsMap[
                            user.handle
                        ] =
                            user.rating
                            ?? 1500;
                    }
                }

                console.log(
                    '[Ratings Collected]',
                    Object.keys(
                        ratingsMap
                    ).length
                );
            }

            console.log(
                '======================================'
            );

            console.log(
                '[CF Predictor] Ratings fetched:',
                Object.keys(
                    ratingsMap
                ).length
            );

            const participants =
                rows
                    .map(row => {

                        const handle =
                            row.party.members[0]
                                ?.handle;

                        if (!handle) {
                            return null;
                        }

                        return {

                            handle,

                            rank:
                                row.rank,

                            points:
                                row.points,

                            penalty:
                                row.penalty,

                            rating:
                                ratingsMap[
                                    handle
                                ] ?? 1500
                        };
                    })
                    .filter(Boolean);

            console.log(
                '[CF Predictor] Participants:',
                participants.length
            );

            console.log(
                '[CF Predictor] Running FFT predictor...'
            );

            const predictStart =
                performance.now();

            const predictions =
                predictRatingChanges(
                    participants
                );

            const predictEnd =
                performance.now();

            console.log(
                `[CF Predictor] Predictor time=${Math.round(predictEnd - predictStart)}ms`
            );

            console.log(
                '[CF Predictor] Predictions done'
            );

            console.log(
                '======================================'
            );

            sendResponse({

                success: true,

                predictions
            });

        } catch (err) {

            console.error(
                '[CF Predictor Error]',
                err
            );

            sendResponse({

                success: false,

                error:
                    err.message
            });
        }

        return true;
    }
);
