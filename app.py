from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Value Iteration parameters
GAMMA = 0.9
THETA = 1e-4

def get_possible_actions():
    # Actions: 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
    return [0, 1, 2, 3]

def get_transition(state, action, grid_size, blocks):
    r, c = state
    # Action effects: UP=(-1, 0), RIGHT=(0, 1), DOWN=(1, 0), LEFT=(0, -1)
    if action == 0: nr, nc = r - 1, c
    elif action == 1: nr, nc = r, c + 1
    elif action == 2: nr, nc = r + 1, c
    elif action == 3: nr, nc = r, c - 1
    
    # Check boundaries and blocks
    if nr < 0 or nr >= grid_size or nc < 0 or nc >= grid_size or [nr, nc] in blocks:
        return state # Bounce back to same state
    return [nr, nc]

def calculate_value_iteration(grid_size, start, end, blocks):
    # Initialize V to 0 for all states
    V = [[0.0 for _ in range(grid_size)] for _ in range(grid_size)]
    policy = [[-1 for _ in range(grid_size)] for _ in range(grid_size)]
    
    # Reward setup: 10 for reaching End, -0.1 for each step.
    step_reward = -0.1
    goal_reward = 10.0
    
    while True:
        delta = 0
        new_V = [[V[r][c] for c in range(grid_size)] for r in range(grid_size)]
        
        for r in range(grid_size):
            for c in range(grid_size):
                state = [r, c]
                if state == end:
                    # Terminal state value is 0
                    continue
                if state in blocks:
                    continue
                
                max_v = float('-inf')
                best_a = -1
                
                for a in get_possible_actions():
                    next_state = get_transition(state, a, grid_size, blocks)
                    nr, nc = next_state
                    
                    if next_state == end:
                        r_s_a = goal_reward
                    else:
                        r_s_a = step_reward
                    
                    v_a = r_s_a + GAMMA * V[nr][nc]
                    
                    if v_a > max_v:
                        max_v = v_a
                        best_a = a
                
                new_V[r][c] = max_v
                policy[r][c] = best_a
                
                delta = max(delta, abs(new_V[r][c] - V[r][c]))
        
        V = new_V
        if delta < THETA:
            break
            
    return V, policy

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/solve', methods=['POST'])
def solve():
    data = request.json
    grid_size = data.get('grid_size', 5)
    start = data.get('start', [0, 0])
    end = data.get('end', [4, 4])
    blocks = data.get('blocks', [[1, 1], [2, 2], [3, 3]])
    
    V, policy = calculate_value_iteration(grid_size, start, end, blocks)
    
    return jsonify({
        'values': V,
        'policy': policy
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
