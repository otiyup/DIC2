document.addEventListener("DOMContentLoaded", () => {
    const gridEl = document.getElementById("grid");
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const runBtn = document.getElementById("run-btn");
    const viewModeSelect = document.getElementById("view-mode");

    const SIZE = 5;
    let start = [0, 0];
    let end = [4, 4];
    let blocks = [[1, 1], [2, 2], [3, 3]];
    
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
        let mode = "start";
        modeRadios.forEach(radio => {
            if (radio.checked) mode = radio.value;
        });

        const isStart = start[0] === r && start[1] === c;
        const isEnd = end[0] === r && end[1] === c;
        const blockIndex = blocks.findIndex(b => b[0] === r && b[1] === c);

        if (mode === "start") {
            if (!isEnd && blockIndex === -1) start = [r, c];
        } else if (mode === "end") {
            if (!isStart && blockIndex === -1) end = [r, c];
        } else if (mode === "block") {
            if (!isStart && !isEnd && blockIndex === -1) {
                blocks.push([r, c]);
            }
        } else if (mode === "clear") {
            if (blockIndex !== -1) {
                blocks.splice(blockIndex, 1);
            }
        }
        
        // Reset computed when grid changes to prevent outdated display
        currentValues = [];
        currentPolicy = [];
        
        updateGridUI();
        renderOverlay();
    }

    function updateGridUI() {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
                cell.className = "cell"; // Reset
                const textContainer = cell.querySelector('.cell-text');
                textContainer.innerHTML = '';
                
                if (start[0] === r && start[1] === c) {
                    cell.classList.add("start");
                    textContainer.textContent = "S";
                    cell.title = "Start Cell";
                } else if (end[0] === r && end[1] === c) {
                    cell.classList.add("end");
                    textContainer.textContent = "E";
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

    function runValueIteration() {
        runBtn.disabled = true;
        runBtn.textContent = "Computing...";
        
        // Use setTimeout to allow UI to update to "Computing..."
        setTimeout(() => {
            try {
                const result = runValueIterationLogic();
                currentValues = result.values;
                currentPolicy = result.policy;
                
                // Auto switch to optimal policy view if it was on random
                if (viewModeSelect.value === "random") {
                    viewModeSelect.value = "optimal";
                }
                
                renderOverlay();
            } catch (err) {
                console.error(err);
                alert("Error running Value Iteration");
            } finally {
                runBtn.disabled = false;
                runBtn.textContent = "Compute Value Iteration";
            }
        }, 10);
    }

    function renderOverlay() {
        const viewMode = viewModeSelect.value;
        
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
                const overlay = cell.querySelector('.overlay');
                const textContainer = cell.querySelector('.cell-text');
                
                overlay.textContent = '';
                overlay.className = "overlay"; // reset
                
                const isGoal = (r === end[0] && c === end[1]);
                const isBlock = blocks.some(b => b[0] === r && b[1] === c);
                const isStart = (r === start[0] && c === start[1]);
                
                if (isGoal) {
                    if (viewMode === "values" && currentValues.length) {
                        textContainer.textContent = "";
                        overlay.textContent = currentValues[r][c].toFixed(1);
                        overlay.classList.add("value-mode");
                        overlay.style.color = "white";
                    } else if (viewMode === "optimal") {
                        textContainer.textContent = "E";
                        overlay.textContent = "🎯";
                        overlay.style.fontSize = "1rem";
                        overlay.style.transform = "translateY(15px)"; // Push it lower
                    } else {
                        textContainer.textContent = "E";
                    }
                    continue;
                }
                
                if (isBlock) continue;
                
                // Set default text for Start unless overwritten
                if (isStart && viewMode !== "values") {
                     textContainer.textContent = "S";
                } else if (isStart && viewMode === "values" && currentValues.length) {
                     textContainer.textContent = "";
                } else if (!isStart && !isGoal) {
                     textContainer.textContent = "";
                }
                
                if (viewMode === "random") {
                    const randomAction = Math.floor(Math.random() * 4);
                    overlay.textContent = arrowMap[randomAction];
                    if (isStart) {
                        overlay.style.color = "white";
                        overlay.style.fontSize = "1.5rem";
                    }
                } else if (viewMode === "values") {
                    overlay.classList.add("value-mode");
                    if (currentValues.length > 0) {
                        overlay.textContent = currentValues[r][c].toFixed(1);
                        if(isStart) overlay.style.color = "white";
                    }
                } else if (viewMode === "optimal") {
                    if (currentPolicy.length > 0) {
                        const action = currentPolicy[r][c];
                        if (action !== -1) {
                            overlay.textContent = arrowMap[action];
                            if(isStart) overlay.style.color = "white";
                        }
                    }
                }
            }
        }
    }

    runBtn.addEventListener("click", runValueIteration);
    viewModeSelect.addEventListener("change", renderOverlay);

    initGrid();
});
