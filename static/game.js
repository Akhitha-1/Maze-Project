const startScreen = document.getElementById("start-screen");
const menuScreen = document.getElementById("menu-screen");
const aiModeScreen = document.getElementById("ai-mode-screen");
const gameScreen = document.getElementById("game-screen");
const resultModal = document.getElementById("result-modal");

const startBtn = document.getElementById("start-btn");
const humanBtn = document.getElementById("human-btn");
const aiBtn = document.getElementById("ai-btn");

const qlBtn = document.getElementById("ql-btn");
const sarsaBtn = document.getElementById("sarsa-btn");

const menuBtn = document.getElementById("menu-btn");
const playAgainBtn = document.getElementById("play-again");
const backMenuBtn = document.getElementById("back-menu");
const backAiMenuBtn = document.getElementById("back-ai-menu");

const resultTitle = document.getElementById("result-title");
const resultScore = document.getElementById("result-score");
const highscoreMsg = document.getElementById("highscore-msg");

const canvas = document.getElementById("maze-canvas");
const ctx = canvas.getContext("2d");

const images = {};
let imagesLoaded = 0;
const totalImagesToLoad = 2;

// Background music element and controls
const bgMusic = document.getElementById('bg-music');
const authScreen = document.getElementById('auth-screen');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authMessage = document.getElementById('auth-message');

function showMessage(msg, isError = false) {
  authMessage.textContent = msg;
  authMessage.style.color = isError ? 'red' : 'green';
}

// Hide all screens except auth on load
function showAuthScreen() {
  authScreen.classList.remove('hidden');
  startScreen.classList.add('hidden');
  menuScreen.classList.add('hidden');
  aiModeScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  resultModal.classList.add('hidden');
}

showAuthScreen();

async function loginUser() {
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  if (!username || !password) {
    showMessage('Please enter username and password', true);
    return;
  }

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Login successful!');
      // Proceed to start screen
      authScreen.classList.add('hidden');
      startScreen.classList.remove('hidden');
      // Clear input fields
      authUsername.value = '';
      authPassword.value = '';
    } else {
      showMessage(data.error || 'Login failed', true);
    }
  } catch (e) {
    showMessage('Error during login', true);
  }
}

async function registerUser() {
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  if (!username || !password) {
    showMessage('Please enter username and password', true);
    return;
  }

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Registration successful! Please login.');
      authUsername.value = '';
      authPassword.value = '';
    } else {
      showMessage(data.error || 'Registration failed', true);
    }
  } catch (e) {
    showMessage('Error during registration', true);
  }
}

loginBtn.onclick = loginUser;
registerBtn.onclick = registerUser;

function playBackgroundMusic() {
  bgMusic.volume = 0.3; // Adjust volume as needed
  bgMusic.play().catch(e => {
    console.log("Background music play blocked:", e);
  });
}

function pauseBackgroundMusic() {
  bgMusic.pause();
}

// Preload images and call callback after all loaded
function preloadImages(imageSources, callback) {
  const keys = Object.keys(imageSources);
  keys.forEach(key => {
    images[key] = new Image();
    images[key].src = imageSources[key];
    images[key].onload = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImagesToLoad) {
        callback();
      }
    };
  });
}

// Preload human and door images
preloadImages({
  human: 'static/human.png',
  door: 'static/door.png'
}, () => {
  if (currentMaze && startCell && exitCell) {
    drawMaze(currentMaze, currentPlayer, startCell, exitCell);
  }
});

let mode = null;
let aiAlgo = "q";
let score = 0;
let highscore = Number(localStorage.getItem("highscore") || "0");
let wonDisplayed = false;

let currentMaze = null, currentPlayer = null, startCell = null, exitCell = null;

function resizeCanvas() {
  const size = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.7);
  canvas.width = size;
  canvas.height = size;
  if (currentMaze && startCell && exitCell) {
    drawMaze(currentMaze, currentPlayer, startCell, exitCell);
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Removed bgMusic.play() from startBtn.onclick because music starts on game open
startBtn.onclick = () => {
  startScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
};

humanBtn.onclick = () => {
  menuScreen.classList.add("hidden");
  mode = "human";
  openGame();
};

aiBtn.onclick = () => {
  menuScreen.classList.add("hidden");
  aiModeScreen.classList.remove("hidden");
};

qlBtn.onclick = () => {
  aiAlgo = "q";
  aiModeScreen.classList.add("hidden");
  mode = "ai";
  openGame();
};

sarsaBtn.onclick = () => {
  aiAlgo = "sarsa";
  aiModeScreen.classList.add("hidden");
  mode = "ai";
  openGame();
};

backAiMenuBtn && (backAiMenuBtn.onclick = () => {
  aiModeScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
});

menuBtn.onclick = function() {
  gameScreen.classList.add("hidden");
  resultModal.classList.add("hidden");
  menuScreen.classList.add("hidden");
  startScreen.classList.remove("hidden"); // Show start page
  pauseBackgroundMusic();
};

playAgainBtn.onclick = () => {
  pauseBackgroundMusic(); // Pause music before restarting game
  resultModal.classList.add("hidden");
  openGame(true);
};

backMenuBtn.onclick = function() {
  resultModal.classList.add("hidden");
  gameScreen.classList.add("hidden");
  menuScreen.classList.add("hidden");
  startScreen.classList.remove("hidden"); // Show start page
  pauseBackgroundMusic();
};

function updateScore() {
  document.getElementById("score").innerText = score;
  document.getElementById("highscore").innerText = highscore;
  document.getElementById("reset-highscore").onclick = function () {
    localStorage.removeItem("highscore");
    highscore = 0;
    updateScore();
  };
}

function showNewHighScoreMessage() {
  if (!highscoreMsg) return;
  highscoreMsg.style.opacity = "1";
  setTimeout(() => {
    highscoreMsg.style.opacity = "0";
  }, 2500);
}

function showResult(won) {
  if (wonDisplayed) return;
  wonDisplayed = true;

  resultTitle.innerText = won ? "You Won!" : "Game Over!";
  resultScore.innerText = score;
  resultModal.classList.remove("hidden");

  pauseBackgroundMusic(); // Pause music on game result modal display

  if (won) {
    confetti({
      particleCount: 130,
      spread: 100,
      origin: { y: 0.6 }
    });

    if (score > highscore) {
      highscore = score;
      localStorage.setItem("highscore", highscore);
      updateScore();
      showNewHighScoreMessage();
    }
  }
}

function openGame(restart = false) {
  menuScreen.classList.add("hidden");
  aiModeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resultModal.classList.add("hidden");

  score = 0;
  wonDisplayed = false;
  updateScore();

  currentMaze = null; currentPlayer = null; startCell = null; exitCell = null;

  resizeCanvas();

  playBackgroundMusic(); // Start music on game start

  if (mode === "human") {
    startHumanGame();
  } else if (mode === "ai") {
    runAI(aiAlgo);
  }
}

// Draw maze, startHumanGame, runAI, and other existing functions remain unchanged

function drawMaze(maze, player, start, exit) {
  if (!maze) return;
  const size = canvas.width;
  const rows = maze.length, cols = maze[0].length;
  const cellSize = size / cols;
  ctx.clearRect(0, 0, size, size);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = maze[y][x] === 1 ? "#333" : "#eee";
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
  // Draw exit door image
  ctx.drawImage(images.door, exit.x * cellSize, exit.y * cellSize, cellSize, cellSize);
  // Draw player image or human at start
  if (player) {
    ctx.drawImage(images.human, player.x * cellSize, player.y * cellSize, cellSize, cellSize);
  } else {
    ctx.drawImage(images.human, start.x * cellSize, start.y * cellSize, cellSize, cellSize);
  }
}

// Human mode
function startHumanGame() {
  fetch('/api/create_maze?rows=15&cols=15')
    .then(res => res.json())
    .then(data => {
      const maze = data.grid;
      const rows = maze.length, cols = maze[0].length;
      const start = { x: data.start[1], y: data.start[0] };
      const exit = { x: data.exit[1], y: data.exit[0] };
      let player = { ...start };
      currentMaze = maze; startCell = start; exitCell = exit; currentPlayer = player;

      drawMaze(maze, player, start, exit);

      document.onkeydown = function (e) {
        let newX = player.x, newY = player.y;
        if (e.key === "ArrowUp") newY--;
        else if (e.key === "ArrowDown") newY++;
        else if (e.key === "ArrowLeft") newX--;
        else if (e.key === "ArrowRight") newX++;
        else return;
        if (newX < 0 || newX >= cols || newY < 0 || newY >= rows) {
          score -= 5; updateScore(); return;
        }
        if (maze[newY][newX] === 1) {
          score -= 5; updateScore(); return;
        }
        player.x = newX; player.y = newY; score -= 1; updateScore();
        drawMaze(maze, player, start, exit);
        if (player.x === exit.x && player.y === exit.y) {
          score += 100; updateScore(); showResult(true);
          document.onkeydown = null;
        }
      };
    });
}

// AI mode
function runAI(algo) {
  fetch('/api/create_maze?rows=15&cols=15')
    .then(res => res.json())
    .then(data => {
      const maze = data.grid;
      const rows = maze.length, cols = maze[0].length;
      const start = data.start, exit = data.exit;
      const cellSize = canvas.width / cols;
      currentMaze = maze;
      startCell = { x: start[1], y: start[0] };
      exitCell = { x: exit[1], y: exit[0] };
      currentPlayer = null;
      drawMaze(maze, null, startCell, exitCell);
      let path = [];
      let step = 0;
      score = 0; updateScore();

      fetch('/api/run_ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid: maze, start, exit, algo })
      })
        .then(res => res.json())
        .then(res => {
          if (!res.path || res.path.length === 0) {
            alert("AI could not find a path in this maze.");
            showResult(false);
            return;
          }
          path = res.path;
          let reachedGoal = false;

          function drawStep() {
            let aiPos = step < path.length ? { x: path[step][1], y: path[step][0] } : null;
            drawMaze(maze, aiPos, startCell, exitCell);
            if (step < path.length) {
              score -= 1; updateScore();
              if (aiPos && aiPos.x === exitCell.x && aiPos.y === exitCell.y) {
                reachedGoal = true;
              }
            }
          }
          function animate() {
            if (step < path.length) {
              drawStep();
              step++;
              setTimeout(animate, 120);
            } else {
              if (reachedGoal) score += 100;
              updateScore();
              showResult(reachedGoal);
            }
          }
          animate();
        });
    });
}



