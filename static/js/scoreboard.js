document.addEventListener('DOMContentLoaded', function() {
    const updateInterval = 1000; // 1 second

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

    function updateScoreboard() {
        fetch('/api/get_state')
            .then(response => response.json())
            .then(data => {
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

        // Team A
        els.teamAName.textContent = data.teamA.name || 'Team A';
        els.teamAColorBar.style.backgroundColor = data.teamA.color || '#dc3545';
        renderPlayers(els.playersA, data.teamA, data.mode);
        els.scoreA.textContent = data.teamA.score ?? 0;
        els.setsA.textContent = data.teamA.sets ?? 0;
        
        // Team B
        els.teamBName.textContent = data.teamB.name || 'Team B';
        els.teamBColorBar.style.backgroundColor = data.teamB.color || '#0d6efd';
        renderPlayers(els.playersB, data.teamB, data.mode);
        els.scoreB.textContent = data.teamB.score ?? 0;
        els.setsB.textContent = data.teamB.sets ?? 0;

        // Serve Indicator
        // Logic: if game is active, show who is serving
        if (data.servingTeam === 'A') {
            els.serveA.classList.add('active');
            els.serveB.classList.remove('active');
        } else if (data.servingTeam === 'B') {
            els.serveA.classList.remove('active');
            els.serveB.classList.add('active');
        } else {
            els.serveA.classList.remove('active');
            els.serveB.classList.remove('active');
        }

        // History
        renderHistory(data.previousSets);
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

    function renderHistory(previousSets) {
        // previousSets is array of {scoreA, scoreB}
        els.historyContainer.innerHTML = '';
        
        if (previousSets && previousSets.length > 0) {
            previousSets.forEach((set, index) => {
                const item = document.createElement('div');
                item.className = 'history-item';
                // script.js uses snake_case (score_a, score_b) for previousSets
                const sA = set.score_a !== undefined ? set.score_a : set.scoreA;
                const sB = set.score_b !== undefined ? set.score_b : set.scoreB;
                item.textContent = `${sA} - ${sB}`;
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
