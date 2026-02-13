const BOARD_SIZE = 8;
const SLOT_COUNT = 3;

const PIECE_LIBRARY = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]],
];

const boardEl = document.getElementById("board");
const piecesEl = document.getElementById("pieces");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");

let board = [];
let pieceSlots = [];
let selectedSlot = null;
let score = 0;
let best = Number(localStorage.getItem("blockBlastBest") || 0);
let gameOver = false;

function createBoard() {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  boardEl.innerHTML = "";

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener("mouseenter", () => showPreview(x, y));
      cell.addEventListener("mouseleave", clearPreview);
      cell.addEventListener("click", () => placeSelectedPiece(x, y));
      boardEl.appendChild(cell);
    }
  }
}

function randomPiece() {
  const shape = PIECE_LIBRARY[Math.floor(Math.random() * PIECE_LIBRARY.length)];
  return { blocks: shape };
}

function refillPieces() {
  if (pieceSlots.every((slot) => slot === null)) {
    pieceSlots = Array.from({ length: SLOT_COUNT }, randomPiece);
  }
}

function renderPieces() {
  piecesEl.innerHTML = "";

  pieceSlots.forEach((piece, index) => {
    const wrapper = document.createElement("button");
    wrapper.type = "button";
    wrapper.className = "piece";
    if (index === selectedSlot) wrapper.classList.add("selected");

    if (!piece) {
      wrapper.disabled = true;
      wrapper.textContent = "使用済み";
      piecesEl.appendChild(wrapper);
      return;
    }

    wrapper.addEventListener("click", () => {
      selectedSlot = selectedSlot === index ? null : index;
      renderPieces();
      clearPreview();
      statusEl.textContent = selectedSlot === null ? "" : "配置場所をクリック";
    });

    const grid = document.createElement("div");
    grid.className = "piece-grid";

    const points = new Set(piece.blocks.map(([x, y]) => `${x},${y}`));
    const maxX = Math.max(...piece.blocks.map(([x]) => x));
    const maxY = Math.max(...piece.blocks.map(([, y]) => y));

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const pixel = document.createElement("span");
        pixel.className = "piece-cell";

        if (x <= maxX && y <= maxY && points.has(`${x},${y}`)) {
          pixel.classList.add("on");
        }

        grid.appendChild(pixel);
      }
    }

    wrapper.appendChild(grid);
    piecesEl.appendChild(wrapper);
  });
}

function boardCell(x, y) {
  return boardEl.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
}

function isValidPlacement(piece, originX, originY) {
  return piece.blocks.every(([dx, dy]) => {
    const x = originX + dx;
    const y = originY + dy;
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && board[y][x] === 0;
  });
}

function showPreview(originX, originY) {
  clearPreview();
  if (selectedSlot === null) return;

  const piece = pieceSlots[selectedSlot];
  if (!piece) return;

  const valid = isValidPlacement(piece, originX, originY);

  piece.blocks.forEach(([dx, dy]) => {
    const x = originX + dx;
    const y = originY + dy;
    const target = boardCell(x, y);
    if (target) {
      target.classList.add(valid ? "preview" : "invalid");
    }
  });
}

function clearPreview() {
  boardEl.querySelectorAll(".preview, .invalid").forEach((cell) => {
    cell.classList.remove("preview", "invalid");
  });
}

function updateBoardVisual() {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      boardCell(x, y)?.classList.toggle("filled", board[y][x] === 1);
    }
  }
}

function clearLines() {
  const fullRows = [];
  const fullCols = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    if (board[y].every((v) => v === 1)) fullRows.push(y);
  }

  for (let x = 0; x < BOARD_SIZE; x++) {
    if (board.every((row) => row[x] === 1)) fullCols.push(x);
  }

  fullRows.forEach((row) => {
    for (let x = 0; x < BOARD_SIZE; x++) board[row][x] = 0;
  });

  fullCols.forEach((col) => {
    for (let y = 0; y < BOARD_SIZE; y++) board[y][col] = 0;
  });

  const lines = fullRows.length + fullCols.length;
  if (lines > 0) {
    score += lines * 25;
    statusEl.textContent = `${lines}ライン消去！`;
  }
}

function placeSelectedPiece(originX, originY) {
  if (gameOver || selectedSlot === null) return;

  const piece = pieceSlots[selectedSlot];
  if (!piece) return;

  if (!isValidPlacement(piece, originX, originY)) {
    statusEl.textContent = "そこには置けません";
    return;
  }

  piece.blocks.forEach(([dx, dy]) => {
    board[originY + dy][originX + dx] = 1;
  });

  score += piece.blocks.length;
  pieceSlots[selectedSlot] = null;
  selectedSlot = null;

  clearLines();
  refillPieces();
  updateBoardVisual();
  renderPieces();
  updateScore();
  clearPreview();
  checkGameOver();
}

function hasAnyValidMove(piece) {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidPlacement(piece, x, y)) return true;
    }
  }
  return false;
}

function checkGameOver() {
  const activePieces = pieceSlots.filter(Boolean);
  if (activePieces.length === 0) return;

  const playable = activePieces.some((piece) => hasAnyValidMove(piece));
  if (!playable) {
    gameOver = true;
    statusEl.textContent = "ゲームオーバー。リスタートして再挑戦！";
  }
}

function updateScore() {
  scoreEl.textContent = String(score);
  if (score > best) {
    best = score;
    localStorage.setItem("blockBlastBest", String(best));
  }
  bestEl.textContent = String(best);
}

function startGame() {
  score = 0;
  selectedSlot = null;
  gameOver = false;
  statusEl.textContent = "";
  pieceSlots = Array.from({ length: SLOT_COUNT }, randomPiece);
  createBoard();
  renderPieces();
  updateBoardVisual();
  updateScore();
}

restartBtn.addEventListener("click", startGame);

startGame();
