const BASE_URL =
    'https://codeforces.com/api';

export class Api {

    async fetch(
        method,
        params = {}
    ) {

        const query =
            new URLSearchParams(
                params
            ).toString();

        const url =
            `${BASE_URL}/${method}?${query}`;

        const response =
            await fetch(url);

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            data.status !== 'OK'
        ) {

            throw new Error(
                data.comment
                ||
                'CF API failed'
            );
        }

        return data.result;
    }

    async contestStandings(
        contestId
    ) {

        return await this.fetch(
            'contest.standings',
            {
                contestId
            }
        );
    }

    async userInfo(handles) {

        return await this.fetch(
            'user.info',
            {
                handles:
                    handles.join(';')
            }
        );
    }
}
