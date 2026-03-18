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

    // Actions: 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
    const arrowMap = ["↑", "→", "↓", "←"];

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

    async function runValueIteration() {
        runBtn.disabled = true;
        runBtn.textContent = "Computing...";
        
        try {
            const response = await fetch('/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grid_size: SIZE,
                    start: start,
                    end: end,
                    blocks: blocks
                })
            });
            
            const data = await response.json();
            currentValues = data.values;
            currentPolicy = data.policy;
            
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
