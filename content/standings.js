function getContestId() {

    const parts =
        window.location.pathname.split('/');

    const contestIndex =
        parts.indexOf('contest');

    if (contestIndex === -1) {
        return null;
    }

    return Number(
        parts[contestIndex + 1]
    );
}

function getCFColor(rating) {

    if (rating == null) {
        return '#888';
    }

    if (rating < 1200) {
        return '#808080';
    }

    if (rating < 1400) {
        return '#008000';
    }

    if (rating < 1600) {
        return '#03A89E';
    }

    if (rating < 1900) {
        return '#0000FF';
    }

    if (rating < 2100) {
        return '#AA00AA';
    }

    if (rating < 2400) {
        return '#FF8C00';
    }

    return '#FF0000';
}

function animateCell(td) {

    td.style.transition =
        'all 0.25s ease';

    td.style.opacity = '0';

    td.style.transform =
        'translateY(6px)';

    requestAnimationFrame(() => {

        td.style.opacity = '1';

        td.style.transform =
            'translateY(0)';
    });
}

function injectHeaders(table) {
    // Check if we've already injected
    if (table.querySelector('.cf-rating-header')) {
        return;
    }

    // Codeforces usually just uses tr elements. Grab the very first row.
    const headerRow = table.querySelector('tr');

    if (!headerRow) {
        return;
    }

    const deltaHeader = document.createElement('th');
    deltaHeader.textContent = 'Δ';
    deltaHeader.className = 'cf-rating-header';
    deltaHeader.style.fontWeight = 'bold';
    deltaHeader.style.textAlign = 'center';
    deltaHeader.style.color = '#222';
    deltaHeader.style.minWidth = '70px';

    const performanceHeader = document.createElement('th');
    performanceHeader.textContent = 'Performance';
    performanceHeader.className = 'cf-rating-header';
    performanceHeader.style.fontWeight = 'bold';
    performanceHeader.style.textAlign = 'center';
    performanceHeader.style.color = '#222';
    performanceHeader.style.minWidth = '110px';

    // Append to the first row instead of the non-existent second row
    headerRow.appendChild(deltaHeader);
    headerRow.appendChild(performanceHeader);
}
function createDeltaCell(
    prediction
) {

    const td =
        document.createElement('td');

    td.style.fontWeight =
        'bold';

    td.style.textAlign =
        'center';

    td.textContent =
        prediction.delta > 0
            ? `+${prediction.delta}`
            : prediction.delta;

    td.style.color =
        prediction.delta > 0
            ? '#0a0'
            : prediction.delta < 0
                ? '#a00'
                : '#888';

    animateCell(td);

    return td;
}

function createPerformanceCell(
    prediction
) {

    const td =
        document.createElement('td');

    td.style.fontWeight =
        'bold';

    td.style.textAlign =
        'center';

    const performance =

        prediction.newRating
        +
        prediction.delta;

    td.textContent =
        performance;

    td.style.color =
        getCFColor(
            performance
        );

    animateCell(td);

    return td;
}

function appendPrediction(
    row,
    prediction
) {

    if (
        row.dataset.injected === '1'
    ) {

        return;
    }

    const deltaCell =
        createDeltaCell(
            prediction
        );

    const performanceCell =
        createPerformanceCell(
            prediction
        );

    row.appendChild(
        deltaCell
    );

    row.appendChild(
        performanceCell
    );

    row.dataset.injected = '1';
}

function injectLoadingBar() {

    if (
        document.getElementById(
            'cf-loading-bar-wrap'
        )
    ) {

        return;
    }

    const wrap =
        document.createElement('div');

    wrap.id =
        'cf-loading-bar-wrap';

    wrap.style.cssText =
        'width:100%;margin:8px 0;'
        + 'display:flex;align-items:center;'
        + 'gap:12px;';

    const bar =
        document.createElement('div');

    bar.style.cssText =
        'flex:1;height:7px;'
        + 'background:#e5e5e5;'
        + 'border-radius:999px;'
        + 'overflow:hidden;';

    const fill =
        document.createElement('div');

    fill.id =
        'cf-loading-bar-fill';

    fill.style.cssText =
        'height:100%;width:0%;'
        + 'background:#2196f3;'
        + 'border-radius:999px;'
        + 'animation:cf-indeterminate 1.3s infinite ease-in-out;';

    bar.appendChild(fill);

    const label =
        document.createElement('span');

    label.id =
        'cf-loading-label';

    label.textContent =
        'Calculating predictions...';

    label.style.cssText =
        'font-size:12px;'
        + 'color:#555;'
        + 'white-space:nowrap;';

    wrap.appendChild(bar);
    wrap.appendChild(label);

    if (
        !document.getElementById(
            'cf-anim-style'
        )
    ) {

        const style =
            document.createElement('style');

        style.id =
            'cf-anim-style';

        style.textContent =
            '@keyframes cf-indeterminate {'
            + '0%{width:0%;margin-left:0%}'
            + '50%{width:60%;margin-left:20%}'
            + '100%{width:0%;margin-left:100%}'
            + '}';

        document.head.appendChild(style);
    }

    const table =
        document.querySelector(
            '.standings'
        );

    if (table) {

        table.parentNode.insertBefore(
            wrap,
            table
        );
    }
}

function updateLoadingLabel(
    text
) {

    const label =
        document.getElementById(
            'cf-loading-label'
        );

    if (label) {

        label.textContent =
            text;
    }
}

function removeLoadingBar() {

    const wrap =
        document.getElementById(
            'cf-loading-bar-wrap'
        );

    if (wrap) {
        wrap.remove();
    }
}

function injectPredictions(
    table,
    predictions
) {

    const predictionMap = {};

    for (
        const prediction
        of predictions
    ) {

        predictionMap[
            prediction.handle
        ] = prediction;
    }

    const rows =
        [...table.querySelectorAll(
            'tbody tr'
        )];

    rows.forEach(row => {

        const contestantCell =
            row.querySelector(
                'td.contestant-cell'
            );

        if (!contestantCell) {
            return;
        }

        const link =
            contestantCell.querySelector(
                'a'
            );

        if (!link) {
            return;
        }

        const handle =
            link.textContent.trim();

        const prediction =
            predictionMap[handle];

        if (!prediction) {

            row.dataset.injected = '1';

            return;
        }

        appendPrediction(
            row,
            prediction
        );
    });
}

async function main() {

    const contestId =
        getContestId();

    if (!contestId) {
        return;
    }

    const table =
        document.querySelector(
            '.standings'
        );

    if (!table) {
        return;
    }

    injectHeaders(table);

    injectLoadingBar();

    updateLoadingLabel(
        'Fetching standings...'
    );

    const response =
        await chrome.runtime.sendMessage({

            type:
                'GET_PREDICTIONS',

            contestId
        });

    if (
        !response
        ||
        !response.success
    ) {

        console.error(
            response?.error
        );

        removeLoadingBar();

        return;
    }

    updateLoadingLabel(
        'Injecting predictions...'
    );

    injectPredictions(
        table,
        response.predictions
    );

    removeLoadingBar();

    console.log(
        '[PREDICTIONS INJECTED]',
        response.predictions.length
    );
}

main();
