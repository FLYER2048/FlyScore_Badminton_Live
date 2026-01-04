document.addEventListener('DOMContentLoaded', function() {
    // 状态对象
    let gameState = {
        mode: 'MS',
        matchInfo: {
            eventName: '',
            stage: '',
            venue: '',
            umpire: '',
            serviceJudge: '',
            startTime: '',
            endTime: ''
        },
        settings: {
            maxSets: 3,
            pointsPerSet: 21,
            capPoints: 30
        },
        teamA: {
            name: 'Team A',
            color: '#dc3545', // Default Red
            p1: 'A1',
            p2: 'A2',
            score: 0,
            sets: 0,
            // 0: Even/Right (Bottom for A), 1: Odd/Left (Top for A)
            // 初始站位：单打无所谓，双打 P1 在右(0), P2 在左(1)
            positions: { p1: 0, p2: 1 } 
        },
        teamB: {
            name: 'Team B',
            color: '#0d6efd', // Default Blue
            p1: 'B1',
            p2: 'B2',
            score: 0,
            sets: 0,
            // 0: Even/Right (Top for B), 1: Odd/Left (Bottom for B)
            positions: { p1: 0, p2: 1 }
        },
        servingTeam: 'A', // 'A' or 'B'
        serverPlayer: 'p1', // 'p1' or 'p2' (当前发球人)
        leftSideTeam: 'A', // 'A' or 'B' (当前在左侧场地的队伍)
        isActive: false
    };

    // 历史记录栈 (独立于 gameState 以避免递归引用导致的内存溢出)
    let historyStack = [];

    // DOM 元素
    const els = {
        mode: document.getElementById('matchMode'),
        eventName: document.getElementById('eventName'),
        matchStage: document.getElementById('matchStage'),
        matchVenue: document.getElementById('matchVenue'),
        umpireName: document.getElementById('umpireName'),
        serviceJudgeName: document.getElementById('serviceJudgeName'),
        startTime: document.getElementById('startTime'),
        endTime: document.getElementById('endTime'),
        teamAColor: document.getElementById('teamAColor'),
        teamAName: document.getElementById('teamAName'),
        playerA1: document.getElementById('playerA1'),
        playerA2: document.getElementById('playerA2'),
        teamBColor: document.getElementById('teamBColor'),
        teamBName: document.getElementById('teamBName'),
        playerB1: document.getElementById('playerB1'),
        playerB2: document.getElementById('playerB2'),
        maxSets: document.getElementById('maxSets'),
        pointsPerSet: document.getElementById('pointsPerSet'),
        capPoints: document.getElementById('capPoints'),
        scoreA: document.getElementById('scoreA'),
        scoreB: document.getElementById('scoreB'),
        setsA: document.getElementById('setsA'),
        setsB: document.getElementById('setsB'),
        displayTeamA: document.getElementById('displayTeamA'),
        displayTeamB: document.getElementById('displayTeamB'),
        matchStatus: document.getElementById('matchStatus'),
        refereeAlert: document.getElementById('refereeAlert'),
        refereeMessage: document.getElementById('refereeMessage'),
        courtOverlay: document.getElementById('courtOverlay'),
        btnUndo: document.getElementById('btnUndo'),
        btnSwapSides: document.getElementById('btnSwapSides'),
        btnChangeServer: document.getElementById('btnChangeServer'),
        btnSwapPlayersA: document.getElementById('btnSwapPlayersA'),
        btnSwapPlayersB: document.getElementById('btnSwapPlayersB'),
        btnAddScores: document.querySelectorAll('.btn-add-score'),
        zones: {
            a_odd: document.getElementById('zone_0_1'), // Top Left
            a_even: document.getElementById('zone_0_0'), // Bottom Left
            b_even: document.getElementById('zone_1_1'), // Top Right
            b_odd: document.getElementById('zone_1_0')   // Bottom Right
        }
    };

    // 初始化绑定
    document.getElementById('btnStartMatch').addEventListener('click', startMatch);
    document.getElementById('btnUndo').addEventListener('click', undo);
    document.getElementById('btnSwapSides').addEventListener('click', swapSides); // 仅视觉交换？还是逻辑交换？这里暂不做复杂逻辑，仅重置
    document.getElementById('btnChangeServer').addEventListener('click', manualChangeServer);
    if(els.btnSwapPlayersA) els.btnSwapPlayersA.addEventListener('click', () => swapPlayers('A'));
    if(els.btnSwapPlayersB) els.btnSwapPlayersB.addEventListener('click', () => swapPlayers('B'));
    
    document.querySelectorAll('.btn-add-score').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const team = e.target.getAttribute('data-team');
            addScore(team);
        });
    });

    // 监听比赛模式变化，控制输入框状态
    els.mode.addEventListener('change', updateInputState);

    function updateInputState() {
        const mode = els.mode.value;
        const isSingles = ['MS', 'WS'].includes(mode);
        
        els.playerA2.disabled = isSingles;
        els.playerB2.disabled = isSingles;
        
        if (isSingles) {
            els.playerA2.value = '';
            els.playerB2.value = '';
            els.playerA2.placeholder = '球员2';
            els.playerB2.placeholder = '球员2';
        } else {
            els.playerA2.placeholder = '球员2';
            els.playerB2.placeholder = '球员2';
        }
    }
    // 初始化调用一次
    updateInputState();
    // 初始化按钮文本
    const btnStart = document.getElementById('btnStartMatch');
    if(btnStart) btnStart.textContent = "开始比赛";

    function getNowDateTimeLocal() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // 启动/重置比赛
    function startMatch() {
        // 如果比赛正在进行，执行重置逻辑 (结束比赛)
        if (gameState.isActive) {
            if (!confirm("比赛正在进行中，确定要结束并重置吗？")) {
                return;
            }
            
            // 重置为非活动状态
            gameState.isActive = false;
            gameState.teamA.score = 0;
            gameState.teamB.score = 0;
            gameState.teamA.sets = 0;
            gameState.teamB.sets = 0;
            historyStack = [];
            
            setControlsState(false); // 禁用比赛控制，启用输入框
            updateUI();
            sendToBackend();
            
            // 恢复按钮为“开始比赛”
            if(btnStart) {
                btnStart.textContent = "开始比赛";
                btnStart.classList.remove('btn-danger');
                btnStart.classList.add('btn-success');
            }
            return;
        }

        // 开始新比赛逻辑
        gameState.mode = els.mode.value;

        // Capture Match Info
        gameState.matchInfo.eventName = els.eventName.value;
        gameState.matchInfo.stage = els.matchStage.value;
        gameState.matchInfo.venue = els.matchVenue.value;
        gameState.matchInfo.umpire = els.umpireName.value;
        gameState.matchInfo.serviceJudge = els.serviceJudgeName.value;
        
        // Auto set start time if empty
        if (!els.startTime.value) {
            els.startTime.value = getNowDateTimeLocal();
        }
        gameState.matchInfo.startTime = els.startTime.value;
        gameState.matchInfo.endTime = els.endTime.value;

        gameState.settings.maxSets = parseInt(els.maxSets.value) || 3;
        gameState.settings.pointsPerSet = parseInt(els.pointsPerSet.value) || 21;
        gameState.settings.capPoints = parseInt(els.capPoints.value) || 30;

        gameState.teamA.name = els.teamAName.value || 'Team A';
        gameState.teamA.color = els.teamAColor.value || '#dc3545';
        gameState.teamA.p1 = els.playerA1.value || 'Player A1';
        gameState.teamA.p2 = els.playerA2.value || 'Player A2';
        gameState.teamA.score = 0;
        gameState.teamA.sets = 0;
        gameState.teamA.positions = { p1: 0, p2: 1 }; // Reset positions

        gameState.teamB.name = els.teamBName.value || 'Team B';
        gameState.teamB.color = els.teamBColor.value || '#0d6efd';
        gameState.teamB.p1 = els.playerB1.value || 'Player B1';
        gameState.teamB.p2 = els.playerB2.value || 'Player B2';
        gameState.teamB.score = 0;
        gameState.teamB.sets = 0;
        gameState.teamB.positions = { p1: 0, p2: 1 };

        gameState.servingTeam = 'A'; // Default A starts
        gameState.serverPlayer = 'p1';
        gameState.leftSideTeam = 'A';
        gameState.isActive = true;
        historyStack = [];

        // Log Match Start
        logEvent('match_start', {
            match_info: gameState.matchInfo,
            settings: gameState.settings,
            team_a: { name: gameState.teamA.name, p1: gameState.teamA.p1, p2: gameState.teamA.p2 },
            team_b: { name: gameState.teamB.name, p1: gameState.teamB.p1, p2: gameState.teamB.p2 }
        });

        setControlsState(true);
        updateUI();
        sendToBackend();
        
        // 更新按钮状态为“重置比赛”
        if(btnStart) {
            btnStart.textContent = "重置比赛";
            btnStart.classList.remove('btn-success');
            btnStart.classList.add('btn-danger');
        }
    }

    function setControlsState(gameActive) {
        // 比赛控制按钮
        els.btnUndo.disabled = !gameActive;
        els.btnSwapSides.disabled = !gameActive;
        els.btnChangeServer.disabled = !gameActive;
        
        const isDoubles = gameState.mode.includes('D');
        if(els.btnSwapPlayersA) els.btnSwapPlayersA.disabled = !gameActive || !isDoubles;
        if(els.btnSwapPlayersB) els.btnSwapPlayersB.disabled = !gameActive || !isDoubles;

        els.btnAddScores.forEach(btn => btn.disabled = !gameActive);
        
        // 遮罩层
        if (gameActive) {
            els.courtOverlay.classList.add('d-none');
        } else {
            els.courtOverlay.classList.remove('d-none');
        }

        // 输入框 (比赛进行时禁用)
        const inputs = [
            els.mode, els.maxSets, els.pointsPerSet, els.capPoints,
            els.teamAName, els.teamAColor, els.playerA1, els.playerA2,
            els.teamBName, els.teamBColor, els.playerB1, els.playerB2,
            els.eventName, els.matchStage, els.matchVenue,
            els.umpireName, els.serviceJudgeName, els.startTime, els.endTime
        ];
        inputs.forEach(input => {
            if(input) input.disabled = gameActive;
        });
    }

    // 加分逻辑
    function addScore(team) {
        // Prevent score changes if match is not active
        if (!gameState.isActive) {
            return;
        }
        
        // Capture info BEFORE score update
        const rallyInfo = getCurrentRallyInfo();

        saveState();

        const isDoubles = gameState.mode.includes('D');
        const scoringTeam = team === 'A' ? gameState.teamA : gameState.teamB;
        const otherTeam = team === 'A' ? gameState.teamB : gameState.teamA;

        // 1. 增加分数
        scoringTeam.score++;

        // Log Point
        logEvent('point', {
            winner: team,
            ...rallyInfo,
            newScoreA: gameState.teamA.score,
            newScoreB: gameState.teamB.score
        });

        // 2. 判断是否赢得该局
        if (checkSetWin(scoringTeam.score, otherTeam.score)) {
            // 先确认是否要结束本局，然后再更新状态
            const tempSetsA = gameState.teamA.sets + (team === 'A' ? 1 : 0);
            const tempSetsB = gameState.teamB.sets + (team === 'B' ? 1 : 0);
            const setsNeeded = Math.ceil(gameState.settings.maxSets / 2);
            const wouldWinMatch = (tempSetsA >= setsNeeded || tempSetsB >= setsNeeded);
            
            let confirmMessage;
            if (wouldWinMatch) {
                // 整场比赛结束确认
                confirmMessage = `${scoringTeam.name} 赢得本局!\n\n整场比赛结束，${scoringTeam.name} 获胜 (${tempSetsA}:${tempSetsB})!\n\n确认结束比赛吗？`;
            } else {
                // 本局结束但比赛继续，需要确认
                confirmMessage = `${scoringTeam.name} 赢得本局 (${gameState.teamA.score}:${gameState.teamB.score})!\n\n当前大比分: ${gameState.teamA.name} ${tempSetsA}:${tempSetsB} ${gameState.teamB.name}\n\n确认结束本局并开始下一局吗？`;
            }
            
            if (!confirm(confirmMessage)) {
                // 用户取消，使用undo恢复状态
                undo();
                return;
            }
            
            // 用户确认，继续执行
            scoringTeam.sets++;
            
            // Log Set End
            logEvent('set_end', {
                 winner: team,
                 scoreA: gameState.teamA.score,
                 scoreB: gameState.teamB.score,
                 setsA: gameState.teamA.sets,
                 setsB: gameState.teamB.sets
            });

            // 局间重置分数，但保留大比分
            if (checkMatchWin()) {
                // Set end time
                const timeStr = getNowDateTimeLocal();
                els.endTime.value = timeStr;
                gameState.matchInfo.endTime = timeStr;

                // Log Match End
                logEvent('match_end', {
                     winner: team,
                     finalSetsA: gameState.teamA.sets,
                     finalSetsB: gameState.teamB.sets
                });

                showReferee(`比赛结束! ${scoringTeam.name} 获胜!`);
                
                // Disable all controls when match ends
                gameState.isActive = false;
                setControlsState(false);
                
                // Update start button to show "开始比赛" instead of "重置比赛"
                const btnStart = document.getElementById('btnStartMatch');
                if(btnStart) {
                    btnStart.textContent = "开始比赛";
                    btnStart.classList.remove('btn-danger');
                    btnStart.classList.add('btn-success');
                }
            } else {
                showReferee(`${scoringTeam.name} 赢得该局!`);
                // 下一局开始，分数归零，交换场地逻辑（这里简化为不交换UI，只重置分数）
                // 实际比赛中需要交换场地，这里为了简单，假设用户手动处理或不处理
                gameState.teamA.score = 0;
                gameState.teamB.score = 0;
                // 赢的一方下一局先发球
                gameState.servingTeam = team;
                // 双打重置站位？通常不重置，继续打。但新的一局开始时，可以允许重新站位。
                // 这里简化：保持当前站位逻辑
            }
        } else {
            // 3. 处理发球权和站位
            if (team === gameState.servingTeam) {
                // 发球方得分
                if (isDoubles) {
                    // 双打：发球方得分，发球人换区，继续发球
                    // 交换该队两人的位置状态
                    const p1Pos = scoringTeam.positions.p1;
                    scoringTeam.positions.p1 = scoringTeam.positions.p2;
                    scoringTeam.positions.p2 = p1Pos;
                    // serverPlayer 不变
                } else {
                    // 单打：不需要显式换位，位置由分数奇偶决定
                }
            } else {
                // 接发球方得分 -> 换发球权
                gameState.servingTeam = team;
                // 双打：不换位。发球人变为当前站在对应发球区的人。
                // 单打：发球人就是那个球员。
            }
        }

        updateUI();
        sendToBackend();
    }

    function checkSetWin(score, otherScore) {
        const limit = gameState.settings.pointsPerSet;
        const cap = gameState.settings.capPoints;
        
        if (score >= cap) return true;
        if (score >= limit && (score - otherScore) >= 2) return true;
        return false;
    }

    function checkMatchWin() {
        const setsNeeded = Math.ceil(gameState.settings.maxSets / 2);
        if (gameState.teamA.sets >= setsNeeded || gameState.teamB.sets >= setsNeeded) {
            return true;
        }
        return false;
    }

    // 撤销
    function undo() {
        if (historyStack.length > 0) {
            const prev = historyStack.pop();
            // 恢复状态
            Object.assign(gameState, JSON.parse(prev));

            logEvent('undo', {
                restoredScoreA: gameState.teamA.score,
                restoredScoreB: gameState.teamB.score,
                restoredSetsA: gameState.teamA.sets,
                restoredSetsB: gameState.teamB.sets,
                restoredServingTeam: gameState.servingTeam
            });

            updateUI();
            sendToBackend();
        }
    }

    function saveState() {
        // Deep copy state for history
        const stateCopy = JSON.stringify(gameState);
        historyStack.push(stateCopy);
        if (historyStack.length > 20) historyStack.shift();
    }

    function manualChangeServer() {
        gameState.servingTeam = gameState.servingTeam === 'A' ? 'B' : 'A';
        
        logEvent('manual_change', {
            action: 'change_server',
            newServingTeam: gameState.servingTeam
        });

        updateUI();
        sendToBackend();
    }

    function swapSides() {
        saveState();
        gameState.leftSideTeam = gameState.leftSideTeam === 'A' ? 'B' : 'A';
        
        logEvent('swap_sides', {
            leftSideTeam: gameState.leftSideTeam
        });

        updateUI();
    }

    function showReferee(msg) {
        els.refereeAlert.classList.remove('d-none');
        els.refereeMessage.textContent = msg;
        // 3秒后消失
        setTimeout(() => els.refereeAlert.classList.add('d-none'), 5000);
    }

    function swapPlayers(teamId) {
        // Check if doubles
        if (!gameState.mode.includes('D')) {
            alert("单打模式无法交换球员站位");
            return;
        }
        
        saveState();
        const team = teamId === 'A' ? gameState.teamA : gameState.teamB;
        
        // Swap positions
        const temp = team.positions.p1;
        team.positions.p1 = team.positions.p2;
        team.positions.p2 = temp;
        
        logEvent('manual_change', {
            action: 'swap_players',
            team: teamId,
            newPositions: team.positions
        });

        updateUI();
        sendToBackend();
    }

    // 核心：更新 UI 和 计算站位
    function updateUI() {
        // 确定左右侧队伍
        const leftTeam = gameState.leftSideTeam === 'A' ? gameState.teamA : gameState.teamB;
        const rightTeam = gameState.leftSideTeam === 'A' ? gameState.teamB : gameState.teamA;
        const leftTeamId = gameState.leftSideTeam;
        const rightTeamId = gameState.leftSideTeam === 'A' ? 'B' : 'A';

        // 1. 基础信息 (左侧面板显示左侧队伍，右侧面板显示右侧队伍)
        els.displayTeamA.textContent = leftTeam.name;
        els.scoreA.textContent = leftTeam.score;
        els.setsA.textContent = leftTeam.sets;
        
        // Apply Colors to Left Side
        els.scoreA.style.color = leftTeam.color;
        els.scoreA.classList.remove('text-danger', 'text-primary'); // Remove default classes
        
        // 更新左侧按钮
        const leftBtn = document.querySelector('#areaTeamA .btn-add-score');
        if(leftBtn) {
            leftBtn.setAttribute('data-team', leftTeamId);
            leftBtn.style.color = leftTeam.color;
            leftBtn.style.borderColor = leftTeam.color;
        }

        els.displayTeamB.textContent = rightTeam.name;
        els.scoreB.textContent = rightTeam.score;
        els.setsB.textContent = rightTeam.sets;

        // Apply Colors to Right Side
        els.scoreB.style.color = rightTeam.color;
        els.scoreB.classList.remove('text-danger', 'text-primary'); // Remove default classes

        // 更新右侧按钮
        const rightBtn = document.querySelector('#areaTeamB .btn-add-score');
        if(rightBtn) {
            rightBtn.setAttribute('data-team', rightTeamId);
            rightBtn.style.color = rightTeam.color;
            rightBtn.style.borderColor = rightTeam.color;
        }

        // 2. 比赛状态文字
        let status = "进行中";
        let statusClass = "bg-success"; // 默认绿色

        const limit = gameState.settings.pointsPerSet;
        const sa = gameState.teamA.score;
        const sb = gameState.teamB.score;
        
        if (sa >= limit - 1 || sb >= limit - 1) {
            status = "关键分";
            statusClass = "bg-warning text-dark";
        }
        if (checkSetWin(sa, sb)) {
            status = "局点/结束";
            statusClass = "bg-danger";
        }
        
        els.matchStatus.textContent = status;
        els.matchStatus.className = `badge text-wrap ${statusClass}`;
        els.matchStatus.style.width = '6rem';

        // 3. 场地站位可视化
        renderCourt();
    }

    function renderCourt() {
        // 清除所有内容和高亮
        Object.values(els.zones).forEach(z => {
            z.innerHTML = '';
            z.classList.remove('active-zone');
        });

        const isDoubles = gameState.mode.includes('D');
        
        // 辅助函数：渲染球员
        const renderPlayer = (teamObj, zone, playerLabel) => {
             zone.innerHTML += `<div>${playerLabel}</div>`;
        };

        // 确定左右侧队伍对象
        const leftTeamObj = gameState.leftSideTeam === 'A' ? gameState.teamA : gameState.teamB;
        const rightTeamObj = gameState.leftSideTeam === 'A' ? gameState.teamB : gameState.teamA;

        // 定义物理区域
        // 左侧场地 (Facing Right): Odd->Top(zone_0_1), Even->Bottom(zone_0_0)
        const leftZones = {
            odd: els.zones.a_odd,  // Top Left
            even: els.zones.a_even // Bottom Left
        };

        // 右侧场地 (Facing Left): Odd->Bottom(zone_1_0), Even->Top(zone_1_1)
        const rightZones = {
            odd: els.zones.b_odd,  // Bottom Right
            even: els.zones.b_even // Top Right
        };

        // 渲染左侧队伍
        if (isDoubles) {
            const p1Zone = leftTeamObj.positions.p1 === 1 ? leftZones.odd : leftZones.even;
            const p2Zone = leftTeamObj.positions.p2 === 1 ? leftZones.odd : leftZones.even;
            renderPlayer(leftTeamObj, p1Zone, leftTeamObj.p1);
            renderPlayer(leftTeamObj, p2Zone, leftTeamObj.p2);
        } else {
            // 单打模式：根据发球方来确定位置
            const servingTeamId = gameState.servingTeam;
            const leftTeamId = gameState.leftSideTeam;
            
            // 如果左侧队伍是发球方，位置根据其得分；否则位置根据对手得分的对角线
            if (leftTeamId === servingTeamId) {
                const pos = leftTeamObj.score % 2;
                const zone = pos === 1 ? leftZones.odd : leftZones.even;
                renderPlayer(leftTeamObj, zone, leftTeamObj.p1);
            } else {
                // 左侧是接发球方，右侧是发球方
                const serverPos = rightTeamObj.score % 2;
                // 单打接发球规则：偶数分在右区接发，奇数分在左区接发（与发球方同侧/对角）
                const receiverPos = serverPos; 
                const zone = receiverPos === 1 ? leftZones.odd : leftZones.even;
                renderPlayer(leftTeamObj, zone, leftTeamObj.p1);
            }
        }

        // 渲染右侧队伍
        if (isDoubles) {
            // 注意：右侧 Odd 是 Bottom, Even 是 Top
            const p1Zone = rightTeamObj.positions.p1 === 1 ? rightZones.odd : rightZones.even;
            const p2Zone = rightTeamObj.positions.p2 === 1 ? rightZones.odd : rightZones.even;
            renderPlayer(rightTeamObj, p1Zone, rightTeamObj.p1);
            renderPlayer(rightTeamObj, p2Zone, rightTeamObj.p2);
        } else {
            // 单打模式
            const servingTeamId = gameState.servingTeam;
            const rightTeamId = gameState.leftSideTeam === 'A' ? 'B' : 'A';

            if (rightTeamId === servingTeamId) {
                // 右侧是发球方
                const pos = rightTeamObj.score % 2;
                const zone = pos === 1 ? rightZones.odd : rightZones.even;
                renderPlayer(rightTeamObj, zone, rightTeamObj.p1);
            } else {
                // 右侧是接发球方，左侧是发球方
                const serverPos = leftTeamObj.score % 2;
                // 单打接发球规则：偶数分在右区接发，奇数分在左区接发（与发球方同侧/对角）
                const receiverPos = serverPos;
                const zone = receiverPos === 1 ? rightZones.odd : rightZones.even;
                renderPlayer(rightTeamObj, zone, rightTeamObj.p1);
            }
        }

        // 高亮发球人和接发球人
        const servingTeamId = gameState.servingTeam;
        const servingTeamObj = servingTeamId === 'A' ? gameState.teamA : gameState.teamB;
        const serveZoneIndex = servingTeamObj.score % 2; // 0 or 1

        let serverZone, receiverZone;

        // 判断发球方是在左侧还是右侧
        if (servingTeamId === gameState.leftSideTeam) {
            // 发球方在左侧
            serverZone = serveZoneIndex === 1 ? leftZones.odd : leftZones.even;
            // 接发球方在右侧 (对角线)
            // 左奇(Top) -> 右奇(Bottom)
            // 左偶(Bottom) -> 右偶(Top)
            receiverZone = serveZoneIndex === 1 ? rightZones.odd : rightZones.even;
        } else {
            // 发球方在右侧
            serverZone = serveZoneIndex === 1 ? rightZones.odd : rightZones.even;
            // 接发球方在左侧
            receiverZone = serveZoneIndex === 1 ? leftZones.odd : leftZones.even;
        }

        // 高亮区域
        if (serverZone) serverZone.classList.add('active-zone');
        if (receiverZone) receiverZone.classList.add('active-zone');

        // 标记发球人
        if (serverZone) {
             const nameDiv = serverZone.querySelector('div');
             if (nameDiv) nameDiv.classList.add('server-indicator');
        }

        updateCourtHighlights();
    }

    function updateCourtHighlights() {
        const isDoubles = gameState.mode.includes('D');
        const validArea = document.getElementById('validAreaHighlight');
        const serviceArea = document.getElementById('serviceAreaHighlight'); // Receiver
        const serverArea = document.getElementById('serverAreaHighlight'); // Server
        
        if (!validArea || !serviceArea || !serverArea) return;

        // 1. Highlight Valid Play Area
        validArea.className = isDoubles ? 'highlight-valid-doubles' : 'highlight-valid-singles';

        // 2. Highlight Service & Server Areas
        // Determine server and score
        const servingTeamId = gameState.servingTeam;
        const servingTeamObj = servingTeamId === 'A' ? gameState.teamA : gameState.teamB;
        const score = servingTeamObj.score;
        const isEven = score % 2 === 0;
        
        // Determine side (Left/Right of court)
        const isLeft = servingTeamId === gameState.leftSideTeam;
        
        // Variables for Receiver (Service Area)
        let rTop, rBottom, rLeft, rRight;
        // Variables for Server (Server Area)
        let sTop, sBottom, sLeft, sRight;
        
        if (isLeft) {
            // Server is on Left
            // Server Position:
            // Even -> Bottom Left (Right Service Court for them) -> top:50%, bottom:0%
            // Odd -> Top Left (Left Service Court for them) -> top:0%, bottom:50%
            if (isEven) {
                sTop = '50%'; sBottom = '0%';
            } else {
                sTop = '0%'; sBottom = '50%';
            }
            
            // Receiver Position (Target is Right):
            // Even -> Diagonal -> Top Right -> top:0%, bottom:50%
            // Odd -> Diagonal -> Bottom Right -> top:50%, bottom:0%
            if (isEven) {
                rTop = '0%'; rBottom = '50%';
            } else {
                rTop = '50%'; rBottom = '0%';
            }

        } else {
            // Server is on Right
            // Server Position:
            // Even -> Top Right -> top:0%, bottom:50%
            // Odd -> Bottom Right -> top:50%, bottom:0%
            if (isEven) {
                sTop = '0%'; sBottom = '50%';
            } else {
                sTop = '50%'; sBottom = '0%';
            }

            // Receiver Position (Target is Left):
            // Even -> Diagonal -> Bottom Left -> top:50%, bottom:0%
            // Odd -> Diagonal -> Top Left -> top:0%, bottom:50%
            if (isEven) {
                rTop = '50%'; rBottom = '0%';
            } else {
                rTop = '0%'; rBottom = '50%';
            }
        }
        
        // X Axis Logic
        if (isDoubles) {
            // Doubles Service: Wide and Short
            if (isLeft) {
                // Server (Left): Back Boundary (Doubles) to Short Line
                // line-long-service-doubles-a (5.67%) to line-short-service-a (35.23%)
                sLeft = '5.67%'; sRight = '64.77%'; // 100 - 35.23 = 64.77
                
                // Receiver (Right): Short Line to Back Boundary (Doubles)
                rLeft = '64.77%'; rRight = '5.67%';
            } else {
                // Server (Right)
                sLeft = '64.77%'; sRight = '5.67%';
                
                // Receiver (Left)
                rLeft = '5.67%'; rRight = '64.77%';
            }
        } else {
            // Singles Service: Narrow and Long
            // Y Adjustment for Narrowness (Singles Sidelines)
            // The `top`/`bottom` calculated above are 0% or 50%.
            // For Singles, we need to shrink them to inside the singles sidelines.
            // `line-side-singles-top` { top: 7.54% }
            // `line-side-singles-bottom` { bottom: 7.54% }
            
            // Adjust Server Y
            if (sTop === '0%') sTop = '7.54%';
            if (sBottom === '0%') sBottom = '7.54%';
            
            // Adjust Receiver Y
            if (rTop === '0%') rTop = '7.54%';
            if (rBottom === '0%') rBottom = '7.54%';
            
            // X Axis Logic
            if (isLeft) {
                // Server (Left): Back Boundary (0%) to Short Line (35.23%)
                sLeft = '0%'; sRight = '64.77%';
                
                // Receiver (Right): Short Line (35.23% from Right) to Back Boundary (0% from Right)
                rLeft = '64.77%'; rRight = '0%';
            } else {
                // Server (Right)
                sLeft = '64.77%'; sRight = '0%';
                
                // Receiver (Left)
                rLeft = '0%'; rRight = '64.77%';
            }
        }
        
        // Apply Styles
        serviceArea.style.top = rTop;
        serviceArea.style.bottom = rBottom;
        serviceArea.style.left = rLeft;
        serviceArea.style.right = rRight;
        
        serverArea.style.top = sTop;
        serverArea.style.bottom = sBottom;
        serverArea.style.left = sLeft;
        serverArea.style.right = sRight;
    }

    function logEvent(type, details) {
        const payload = {
            type: type,
            timestamp: getNowDateTimeLocal(),
            details: details
        };
        fetch('/api/log_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error('Error logging event:', err));
    }

    function getCurrentRallyInfo() {
        const servingTeamId = gameState.servingTeam;
        const receivingTeamId = servingTeamId === 'A' ? 'B' : 'A';
        
        const servingTeamObj = servingTeamId === 'A' ? gameState.teamA : gameState.teamB;
        const receivingTeamObj = receivingTeamId === 'A' ? gameState.teamA : gameState.teamB;
        
        const isDoubles = gameState.mode.includes('D');
        
        let serverName = '';
        let receiverName = '';

        if (!isDoubles) {
            serverName = servingTeamObj.p1;
            receiverName = receivingTeamObj.p1;
        } else {
            // Determine Server
            const serverPosIndex = servingTeamObj.score % 2; // 0 or 1
            if (servingTeamObj.positions.p1 === serverPosIndex) serverName = servingTeamObj.p1;
            else serverName = servingTeamObj.p2;
            
            // Determine Receiver
            const receiverPosIndex = serverPosIndex; // Same index (0 or 1)
            if (receivingTeamObj.positions.p1 === receiverPosIndex) receiverName = receivingTeamObj.p1;
            else receiverName = receivingTeamObj.p2;
        }
        
        return {
            serverTeam: servingTeamId,
            serverPlayer: serverName,
            receiverTeam: receivingTeamId,
            receiverPlayer: receiverName,
            scoreA_before: gameState.teamA.score,
            scoreB_before: gameState.teamB.score,
            setsA: gameState.teamA.sets,
            setsB: gameState.teamB.sets
        };
    }

    function sendToBackend() {
        const data = {
            team_a_name: gameState.teamA.name,
            team_b_name: gameState.teamB.name,
            sets_a: gameState.teamA.sets,
            sets_b: gameState.teamB.sets,
            points_a: gameState.teamA.score,
            points_b: gameState.teamB.score,
            serving_team: gameState.servingTeam,
            status_message: els.matchStatus.textContent,
            
            // New fields
            event_name: gameState.matchInfo.eventName,
            match_stage: gameState.matchInfo.stage,
            match_venue: gameState.matchInfo.venue,
            umpire: gameState.matchInfo.umpire,
            service_judge: gameState.matchInfo.serviceJudge,
            start_time: gameState.matchInfo.startTime ? gameState.matchInfo.startTime.replace('T', ' ') : '',
            end_time: gameState.matchInfo.endTime ? gameState.matchInfo.endTime.replace('T', ' ') : '',

            fullState: gameState // 发送完整状态
        };

        fetch('/api/update_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(err => console.error('Error updating backend:', err));
    }

    // 从后端加载状态
    function loadStateFromBackend() {
        fetch('/api/get_state')
            .then(response => response.json())
            .then(data => {
                if (data && data.fullState && data.fullState.isActive) {
                    console.log("Restoring game state...", data.fullState);
                    // 恢复 gameState
                    Object.assign(gameState, data.fullState);
                    
                    // 恢复输入框的值
                    if(els.mode) els.mode.value = gameState.mode;
                    if(els.maxSets) els.maxSets.value = gameState.settings.maxSets;
                    if(els.pointsPerSet) els.pointsPerSet.value = gameState.settings.pointsPerSet;
                    if(els.capPoints) els.capPoints.value = gameState.settings.capPoints;
                    
                    if(els.teamAName) els.teamAName.value = gameState.teamA.name;
                    if(els.teamAColor) els.teamAColor.value = gameState.teamA.color || '#dc3545';
                    if(els.playerA1) els.playerA1.value = gameState.teamA.p1;
                    if(els.playerA2) els.playerA2.value = gameState.teamA.p2;
                    
                    if(els.teamBName) els.teamBName.value = gameState.teamB.name;
                    if(els.teamBColor) els.teamBColor.value = gameState.teamB.color || '#0d6efd';
                    if(els.playerB1) els.playerB1.value = gameState.teamB.p1;
                    if(els.playerB2) els.playerB2.value = gameState.teamB.p2;

                    // Restore Match Info
                    if(gameState.matchInfo) {
                        if(els.eventName) els.eventName.value = gameState.matchInfo.eventName || '';
                        if(els.matchStage) els.matchStage.value = gameState.matchInfo.stage || '';
                        if(els.matchVenue) els.matchVenue.value = gameState.matchInfo.venue || '';
                        if(els.umpireName) els.umpireName.value = gameState.matchInfo.umpire || '';
                        if(els.serviceJudgeName) els.serviceJudgeName.value = gameState.matchInfo.serviceJudge || '';
                        if(els.startTime) els.startTime.value = gameState.matchInfo.startTime || '';
                        if(els.endTime) els.endTime.value = gameState.matchInfo.endTime || '';
                    }

                    // 恢复 UI 状态
                    updateInputState();
                    setControlsState(true);
                    updateUI();
                    
                    // 恢复按钮状态
                    const btnStart = document.getElementById('btnStartMatch');
                    if(btnStart) {
                        btnStart.textContent = "重置比赛";
                        btnStart.classList.remove('btn-success');
                        btnStart.classList.add('btn-danger');
                    }
                }
            })
            .catch(err => console.error('Error loading state:', err));
    }

    // 尝试加载上次的状态
    loadStateFromBackend();
});
