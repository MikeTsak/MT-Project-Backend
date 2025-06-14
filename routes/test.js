const express = require('express');
const db = require('../db');
const axios = require('axios');
const router = express.Router();

router.get('/', async (req, res) => {
  let dbStatus = '🔴 DB Connection Failed';
  let frontendStatus = '🟡 Checking...';
  let dbResult = null;
  let dbPing = '—';

  try {
    const start = Date.now();
    const [rows] = await new Promise((resolve, reject) => {
      db.query('SELECT 1 + 1 AS result', (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
    const end = Date.now();
    dbPing = `${end - start} ms`;
    dbResult = rows[0].result;
    dbStatus = `🟢 MySQL Working`;
  } catch (e) {
    console.error('❌ DB Error:', e);
  }

  try {
    await axios.get('https://mt.miketsak.gr', { timeout: 3000 });
    frontendStatus = '🟢 Frontend Online';
  } catch (e) {
    frontendStatus = '🔴 Frontend Offline';
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>System Status + Tic Tac Toe</title>
      <style>
        body { font-family: sans-serif; background: #f7f7f7; padding: 2rem; }
        h1, h2 { text-align: center; color: #333; }
        .status, .game, footer {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 0 5px rgba(0,0,0,0.1);
          max-width: 480px;
          margin: 1.5rem auto;
        }
        .board {
          display: grid;
          grid-template-columns: repeat(3, 60px);
          grid-gap: 5px;
          justify-content: center;
          margin-top: 1rem;
        }
        .cell {
          width: 60px;
          height: 60px;
          background: #e0e0e0;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
        }
        .cell:hover {
          background: #ccc;
        }
        .footer { text-align: center; margin-top: 2rem; }
        .footer a { color: #0077cc; text-decoration: none; }

        select, button {
          margin: 0.5rem auto;
          display: block;
          padding: 0.5rem;
          font-size: 1rem;
        }
      </style>
    </head>
    <body>
      <h1>✅ System Status</h1>
      <div class="status">
        <p><strong>Backend:</strong> 🟢 Express Server Running</p>
        <p><strong>Database:</strong> ${dbStatus} ${dbResult !== null ? `(Result: ${dbResult}, Ping: ${dbPing})` : ''}</p>
        <p><strong>Frontend:</strong> ${frontendStatus}</p>
      </div>

      <div class="game">
        <h2>🎮 Tic Tac Toe</h2>
        <select id="mode">
          <option value="cpu">Play vs Computer</option>
          <option value="pvp">2 Players</option>
        </select>
        <div id="board" class="board"></div>
        <p id="statusMsg" style="text-align: center;"></p>
        <button onclick="restart()">🔁 Restart</button>
      </div>

      <footer class="footer">
        Made by <a href="https://miketsak.gr">miketsak.gr</a>
      </footer>

      <script>
        const board = document.getElementById('board');
        const statusMsg = document.getElementById('statusMsg');
        const modeSelect = document.getElementById('mode');
        let currentPlayer = 'X';
        let cells = Array(9).fill(null);
        let gameOver = false;

        function render() {
          board.innerHTML = '';
          cells.forEach((value, i) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = value || '';
            cell.onclick = () => handleClick(i);
            board.appendChild(cell);
          });
        }

        function handleClick(i) {
          if (cells[i] || gameOver) return;
          cells[i] = currentPlayer;
          if (checkWinner()) {
            statusMsg.textContent = \`\${currentPlayer} wins!\`;
            gameOver = true;
            return render();
          }
          if (!cells.includes(null)) {
            statusMsg.textContent = 'Draw!';
            gameOver = true;
            return render();
          }
          currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
          render();
          statusMsg.textContent = \`\${currentPlayer}'s turn\`;
          if (modeSelect.value === 'cpu' && currentPlayer === 'O') {
            setTimeout(computerMove, 500);
          }
        }

        function computerMove() {
          const emptyIndexes = cells.map((val, idx) => val === null ? idx : null).filter(v => v !== null);
          const move = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
          if (move !== undefined) handleClick(move);
        }

        function checkWinner() {
          const wins = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
          ];
          return wins.some(([a,b,c]) => cells[a] && cells[a] === cells[b] && cells[a] === cells[c]);
        }

        function restart() {
          cells = Array(9).fill(null);
          currentPlayer = 'X';
          gameOver = false;
          render();
          statusMsg.textContent = \`\${currentPlayer}'s turn\`;
        }

        render();
        statusMsg.textContent = \`\${currentPlayer}'s turn\`;
      </script>
    </body>
    </html>
  `);
});

module.exports = router;
