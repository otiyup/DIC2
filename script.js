document.addEventListener("DOMContentLoaded", () => {
    const gridEl = document.getElementById("grid");
    const resetBtn = document.getElementById("reset-btn");
    const instructionText = document.getElementById("instruction-text");

    const SIZE = 5;
    let start = null;  // [r, c]
    let end = null;    // [r, c]
    let blocks = [];
    
    // 0: Set Start, 1: Set End, 2: Set Blocks
    let clickState = 0; 
    
    let currentValues = [];
    let currentPolicy = [];

    // Value Iteration parameters
    const GAMMA = 0.9;
    const THETA = 1e-4;

    // Actions: 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
    const arrowMap = ["↑", "→", "↓", "←"];
    const actions = [0, 1, 2, 3];

    function initGrid() {
        gridEl.innerHTML = '';
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.createElement("div");
                cell.className = "cell";
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                const textContainer = document.createElement("div");
                textContainer.className = "cell-text";
                cell.appendChild(textContainer);

                const overlay = document.createElement("div");
                overlay.className = "overlay";
                cell.appendChild(overlay);

                cell.addEventListener("click", () => handleCellClick(r, c));
                gridEl.appendChild(cell);
            }
        }
        updateGridUI();
        renderOverlay();
    }

    function handleCellClick(r, c) {
        if (clickState === 0) {
            start = [r, c];
            clickState = 1;
            instructionText.innerHTML = "Click a cell to set the <strong>End</strong> point.";
        } else if (clickState === 1) {
            // Cannot be the same as start
            if (start && start[0] === r && start[1] === c) return;
            end = [r, c];
            clickState = 2;
            instructionText.innerHTML = "Click cells to toggle <strong>Obstacles</strong>.<br>When ready, click <em>Compute Value Iteration</em>.";
        } else if (clickState === 2) {
            // Cannot place block on start or end
            if ((start && start[0] === r && start[1] === c) || 
                (end && end[0] === r && end[1] === c)) {
                return;
            }
            const blockIndex = blocks.findIndex(b => b[0] === r && b[1] === c);
            if (blockIndex === -1) {
                blocks.push([r, c]);
            } else {
                blocks.splice(blockIndex, 1);
            }
        }
        
        // Reset computed policy unless we are fully ready
        currentValues = [];
        currentPolicy = [];
        
        updateGridUI();
        
        if (start && end) {
            const result = runValueIterationLogic();
            currentPolicy = result.policy;
            renderPathAndArrows();
        }
    }
    
    function resetGrid() {
        start = null;
        end = null;
        blocks = [];
        clickState = 0;
        currentValues = [];
        currentPolicy = [];
        instructionText.innerHTML = "Click a cell to set the <strong>Start</strong> point.";
        updateGridUI();
        renderPathAndArrows();
    }
    
    if(resetBtn) resetBtn.addEventListener("click", resetGrid);

    function updateGridUI() {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
                cell.className = "cell"; // Reset
                const textContainer = cell.querySelector('.cell-text');
                textContainer.innerHTML = '';
                
                if (start && start[0] === r && start[1] === c) {
                    cell.classList.add("start");
                    textContainer.textContent = "START";
                    cell.title = "Start Cell";
                } else if (end && end[0] === r && end[1] === c) {
                    cell.classList.add("end");
                    textContainer.textContent = "END";
                    cell.title = "Target Cell";
                } else if (blocks.some(b => b[0] === r && b[1] === c)) {
                    cell.classList.add("block");
                }
            }
        }
    }

    function getTransition(r, c, action) {
        let nr = r;
        let nc = c;
        
        if (action === 0) nr = r - 1;
        else if (action === 1) nc = c + 1;
        else if (action === 2) nr = r + 1;
        else if (action === 3) nc = c - 1;
        
        // Check boundaries and blocks
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || blocks.some(b => b[0] === nr && b[1] === nc)) {
            return [r, c]; // Bounce back
        }
        return [nr, nc];
    }

    function runValueIterationLogic() {
        if (!start || !end) {
            throw new Error("Must set both start and end points.");
        }
        let V = Array(SIZE).fill().map(() => Array(SIZE).fill(0.0));
        let policy = Array(SIZE).fill().map(() => Array(SIZE).fill(-1));
        
        const stepReward = -0.1;
        const goalReward = 10.0;
        
        while (true) {
            let delta = 0;
            let newV = V.map(row => [...row]);
            
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    if (r === end[0] && c === end[1]) continue;
                    if (blocks.some(b => b[0] === r && b[1] === c)) continue;
                    
                    let maxV = -Infinity;
                    let bestA = -1;
                    
                    for (let a of actions) {
                        const [nr, nc] = getTransition(r, c, a);
                        
                        let r_s_a = (nr === end[0] && nc === end[1]) ? goalReward : stepReward;
                        let v_a = r_s_a + GAMMA * V[nr][nc];
                        
                        if (v_a > maxV) {
                            maxV = v_a;
                            bestA = a;
                        }
                    }
                    
                    newV[r][c] = maxV;
                    policy[r][c] = bestA;
                    
                    delta = Math.max(delta, Math.abs(newV[r][c] - V[r][c]));
                }
            }
            
            V = newV;
            if (delta < THETA) break;
        }
        
        return { values: V, policy: policy };
    }

    function renderPathAndArrows() {
        // Clear all previous overlays and paths
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
                if (cell) {
                    cell.classList.remove('path');
                    const overlay = cell.querySelector('.overlay');
                    if (overlay) {
                        overlay.textContent = '';
                        overlay.className = "overlay";
                    }
                }
            }
        }
    
        if (currentPolicy.length === 0 || !start || !end) return;
        
        // 1. Trace the path
        let path = [];
        let currR = start[0];
        let currC = start[1];
        let steps = 0;
        const maxSteps = SIZE * SIZE;
        
        path.push([currR, currC]); // include start in path highlighting
        
        while ((currR !== end[0] || currC !== end[1]) && steps < maxSteps) {
            const action = currentPolicy[currR][currC];
            if (action === -1) break;
            
            const nextState = getTransition(currR, currC, action);
            if (nextState[0] === currR && nextState[1] === currC) break;
            
            currR = nextState[0];
            currC = nextState[1];
            steps++;
            
            path.push([currR, currC]);
            
            if (currR === end[0] && currC === end[1]) {
                break;
            }
        }
        
        // 2. Render arrows and path backgrounds
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
                const overlay = cell.querySelector('.overlay');
                
                const isGoal = (r === end[0] && c === end[1]);
                const isBlock = blocks.some(b => b[0] === r && b[1] === c);
                const isPath = path.some(p => p[0] === r && p[1] === c);
                
                if (isBlock) continue;
                
                // Highlight valid path reaching goal
                if (isPath && steps < maxSteps && path[path.length - 1][0] === end[0] && path[path.length - 1][1] === end[1]) {
                    cell.classList.add('path');
                }
                
                if (isGoal) {
                    continue; // End cell has text 'END' but no directional arrow
                }
                
                // Draw optimal policy arrow on all non-block cells
                const action = currentPolicy[r][c];
                if (action !== -1) {
                    overlay.textContent = arrowMap[action];
                    if (isPath && steps < maxSteps && path[path.length - 1][0] === end[0] && path[path.length - 1][1] === end[1]) {
                        overlay.classList.add("path-arrow");
                    } else {
                        overlay.classList.add("non-path-arrow");
                    }
                }
            }
        }
    }



    initGrid();
});
