from flask import Flask, request, jsonify, send_from_directory
from maze import generate_maze, maze_to_grid
from rl_agents import QLearningAgent, SARSAAgent, train_agent
import numpy as np
from flask import Flask, request, jsonify, session, g, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'your_secret_key'  # Change to your secret key

DATABASE = 'users.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
    return db

def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# Initialize user table (run only once)
def init_db():
    with app.app_context():
        db = get_db()
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        ''')
        db.commit()

init_db()

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

# User Registration
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    password_hash = generate_password_hash(password)
    try:
        db = get_db()
        db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, password_hash))
        db.commit()
        return jsonify({'message': 'User registered successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409

# User Login
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = query_db('SELECT * FROM users WHERE username = ?', [username], one=True)
    if user and check_password_hash(user[2], password):
        session['user_id'] = user[0]
        session['username'] = username
        return jsonify({'message': 'Login successful'})
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

# User Logout
@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})

# Add other existing routes such as /api/create_maze, /api/run_ai here...



@app.route('/api/create_maze', methods=['GET'])
def api_create_maze():
    rows = int(request.args.get('rows', 15))
    cols = int(request.args.get('cols', 15))
    maze = generate_maze(rows, cols)
    grid = maze_to_grid(maze)
    start = [1, 1]
    exit_cell = [rows - 2, cols - 2]
    if exit_cell == start or grid[exit_cell[0], exit_cell[1]] == 1:
        for r in range(rows - 2, 0, -1):
            for c in range(cols - 2, 0, -1):
                if grid[r, c] == 0 and [r, c] != start:
                    exit_cell = [r, c]
                    break
            else:
                continue
            break
    return jsonify({'grid': grid.tolist(), 'start': start, 'exit': exit_cell})


@app.route('/api/run_ai', methods=['POST'])
def api_run_ai():
    data = request.get_json()
    algo = data.get('algo', 'q')
    grid = np.array(data['grid'])
    start = tuple(data['start'])
    exit_cell = tuple(data['exit'])
    rows, cols = grid.shape

    episodes = 3000
    max_steps = 4000

    if algo == 'q':
        agent = QLearningAgent(obs_size=grid.size, action_size=4)
        train_agent(grid, start, exit_cell, agent, episodes=episodes, max_steps=max_steps)
    else:
        agent = SARSAAgent(obs_size=grid.size, action_size=4,
                          epsilon_decay=0.995, alpha=0.4, gamma=0.99)
        train_agent(grid, start, exit_cell, agent, episodes=episodes, max_steps=max_steps)

    path = []
    pos = start

    def idx(p):
        return p[0] * cols + p[1]

    steps = 0
    visited = set()

    while pos != exit_cell and steps < rows * cols * 10:
        s = idx(pos)
        a = int(np.argmax(agent.Q[s]))
        dr, dc = [(-1, 0), (0, 1), (1, 0), (0, -1)][a]
        nr, nc = pos[0] + dr, pos[1] + dc
        if not (0 <= nr < rows and 0 <= nc < cols) or grid[nr, nc] == 1:
            break
        pos = (nr, nc)
        path.append([pos[0], pos[1]])
        if pos in visited:
            break
        visited.add(pos)
        steps += 1

    path = [[start[0], start[1]]] + path
    score = 100 - steps if pos == exit_cell else 0

    return jsonify({'path': path, 'score': score, 'steps': steps})


@app.route('/static/<path:path>')
def static_proxy(path):
    return send_from_directory('static', path)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8501, debug=True)








