document.addEventListener('DOMContentLoaded', function() {
    const updateInterval = 1000; // 1 second
    let isSwapped = false;
    let lastData = null;

    // Elements
    const els = {
        eventName: document.getElementById('eventName'),
        matchStage: document.getElementById('matchStage'),
        
        teamAName: document.getElementById('teamAName'),
        teamAColorBar: document.getElementById('teamAColorBar'),
        playersA: document.getElementById('playersA'),
        scoreA: document.getElementById('scoreA'),
        setsA: document.getElementById('setsA'),
        serveA: document.getElementById('serveA'),

        teamBName: document.getElementById('teamBName'),
        teamBColorBar: document.getElementById('teamBColorBar'),
        playersB: document.getElementById('playersB'),
        scoreB: document.getElementById('scoreB'),
        setsB: document.getElementById('setsB'),
        serveB: document.getElementById('serveB'),

        historyContainer: document.getElementById('historyContainer'),
        matchStatus: document.getElementById('matchStatus')
    };

    const btnSwap = document.getElementById('btnSwap');
    if (btnSwap) {
        btnSwap.addEventListener('click', () => {
            isSwapped = !isSwapped;
            if (lastData) render(lastData);
        });
    }

    function updateScoreboard() {
        fetch('/api/get_state')
            .then(response => response.json())
            .then(data => {
                lastData = data;
                render(data);
            })
            .catch(err => console.error('Error fetching state:', err));
    }

    function render(data) {
        // Compatible with fullState wrapper
        if (data && data.fullState) {
            data = data.fullState;
        }

        if (!data || !data.teamA || !data.teamB) return;

        // Match Info
        els.eventName.textContent = data.matchInfo?.eventName || '';
        els.matchStage.textContent = data.matchInfo?.stage || '';
        els.matchStatus.textContent = data.status_message || '';

        // Combine backend swap state with manual perspective swap
        let backendWantsBOnLeft = (data.leftSideTeam === 'B');
        let effectiveSwap = backendWantsBOnLeft !== isSwapped;

        let displayTeamA = effectiveSwap ? data.teamB : data.teamA;
        let displayTeamB = effectiveSwap ? data.teamA : data.teamB;

        // Team A (Left)
        els.teamAName.textContent = displayTeamA.name || (effectiveSwap ? 'Team B' : 'Team A');
        els.teamAColorBar.style.backgroundColor = displayTeamA.color || (effectiveSwap ? '#0d6efd' : '#dc3545');
        renderPlayers(els.playersA, displayTeamA, data.mode);
        els.scoreA.textContent = displayTeamA.score ?? 0;
        els.setsA.textContent = displayTeamA.sets ?? 0;
        
        // Team B (Right)
        els.teamBName.textContent = displayTeamB.name || (effectiveSwap ? 'Team A' : 'Team B');
        els.teamBColorBar.style.backgroundColor = displayTeamB.color || (effectiveSwap ? '#dc3545' : '#0d6efd');
        renderPlayers(els.playersB, displayTeamB, data.mode);
        els.scoreB.textContent = displayTeamB.score ?? 0;
        els.setsB.textContent = displayTeamB.sets ?? 0;
        // Team B (Right)
        els.teamBName.textContent = displayTeamB.name || (effectiveSwap ? 'Team A' : 'Team B');
        els.teamBColorBar.style.backgroundColor = displayTeamB.color || (effectiveSwap ? '#dc3545' : '#0d6efd');
        renderPlayers(els.playersB, displayTeamB, data.mode);
        els.scoreB.textContent = displayTeamB.score ?? 0;
        els.setsB.textContent = displayTeamB.sets ?? 0;

        // Serve Indicator
        let serveLeft = false;
        let serveRight = false;
        let serveLeft = false;
        let serveRight = false;
        if (data.servingTeam === 'A') {
            if (effectiveSwap) serveRight = true; else serveLeft = true;
        } else if (data.servingTeam === 'B') {
            if (effectiveSwap) serveLeft = true; else serveRight = true;
        }

        if (serveLeft) {
            els.serveA.classList.add('active');
        } else {
            els.serveA.classList.remove('active');
        }

        if (serveRight) {
            els.serveB.classList.add('active');
        } else {
            els.serveB.classList.remove('active');
        }

        // History
        renderHistory(data.previousSets, effectiveSwap);
    }

    function renderPlayers(container, teamData, mode) {
        container.innerHTML = '';
        if (teamData.p1) {
            const p1 = document.createElement('div');
            p1.className = 'player-name';
            p1.textContent = teamData.p1;
            container.appendChild(p1);
        }
        // Check for doubles
        if (mode && mode.includes('D') && teamData.p2) {
            const p2 = document.createElement('div');
            p2.className = 'player-name';
            p2.textContent = teamData.p2;
            container.appendChild(p2);
        }
    }

    function renderHistory(previousSets, effectiveSwap) {
        // previousSets is array of {scoreA, scoreB}
        els.historyContainer.innerHTML = '';
        
        if (previousSets && previousSets.length > 0) {
            previousSets.forEach((set, index) => {
                const item = document.createElement('div');
                item.className = 'history-item';
                // script.js uses snake_case (score_a, score_b) for previousSets
                const sA = set.score_a !== undefined ? set.score_a : set.scoreA;
                const sB = set.score_b !== undefined ? set.score_b : set.scoreB;
                if (effectiveSwap) {
                    item.textContent = `${sB} - ${sA}`;
                } else {
                    item.textContent = `${sA} - ${sB}`;
                }
                els.historyContainer.appendChild(item);
            });
        }
        
        // 自动隐藏空的历史记录区域以节省空间
        if (!previousSets || previousSets.length === 0) {
            // els.historyContainer.style.display = 'none'; // 可选：如果不希望空的时候占位
        } else {
             els.historyContainer.style.display = 'flex';
        }
    }

    // Start Loop
    setInterval(updateScoreboard, updateInterval);
    updateScoreboard(); // Initial call

    // Fullscreen Toggle
    const btnFullscreen = document.getElementById('btnFullscreen');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
             if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }
});
