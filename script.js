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
let draggingSlot = null;
let score = 0;
let best = Number(localStorage.getItem("blockBlastBest") || 0);
let gameOver = false;
let isResolvingTurn = false;

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
      cell.addEventListener("click", () => placePieceFromSlot(selectedSlot, x, y));
      cell.addEventListener("dragover", (event) => {
        event.preventDefault();
        showPreview(x, y, draggingSlot);
      });
      cell.addEventListener("dragleave", clearPreview);
      cell.addEventListener("drop", (event) => {
        event.preventDefault();
        placePieceFromSlot(draggingSlot, x, y);
      });
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
    wrapper.draggable = Boolean(piece);
    if (index === selectedSlot) wrapper.classList.add("selected");

    if (!piece) {
      wrapper.disabled = true;
      wrapper.classList.add("used");
      const usedLabel = document.createElement("span");
      usedLabel.className = "used-label";
      usedLabel.textContent = "使用済み";
      wrapper.appendChild(usedLabel);
      piecesEl.appendChild(wrapper);
      return;
    }

    wrapper.addEventListener("click", () => {
      selectedSlot = selectedSlot === index ? null : index;
      renderPieces();
      clearPreview();
      statusEl.textContent = selectedSlot === null ? "" : "配置場所をクリック or ドラッグ";
    });

    wrapper.addEventListener("dragstart", (event) => {
      draggingSlot = index;
      selectedSlot = index;
      renderPieces();
      statusEl.textContent = "盤面にドロップして配置";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    });

    wrapper.addEventListener("dragend", () => {
      draggingSlot = null;
      clearPreview();
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

function showPreview(originX, originY, slotIndex = selectedSlot) {
  clearPreview();
  if (slotIndex === null) return;

  const piece = pieceSlots[slotIndex];
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearLines() {
  const fullRows = [];
  const fullCols = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    if (board[y].every((v) => v === 1)) fullRows.push(y);
  }

  for (let x = 0; x < BOARD_SIZE; x++) {
    if (board.every((row) => row[x] === 1)) fullCols.push(x);
  }

  const toClear = new Set();
  fullRows.forEach((row) => {
    for (let x = 0; x < BOARD_SIZE; x++) toClear.add(`${x},${row}`);
  });
  fullCols.forEach((col) => {
    for (let y = 0; y < BOARD_SIZE; y++) toClear.add(`${col},${y}`);
  });

  const lines = fullRows.length + fullCols.length;
  if (lines === 0) return;

  toClear.forEach((point) => {
    const [x, y] = point.split(",").map(Number);
    boardCell(x, y)?.classList.add("clear-burst");
  });

  await sleep(180);

  fullRows.forEach((row) => {
    for (let x = 0; x < BOARD_SIZE; x++) board[row][x] = 0;
  });

  fullCols.forEach((col) => {
    for (let y = 0; y < BOARD_SIZE; y++) board[y][col] = 0;
  });

  score += lines * 25;
  statusEl.textContent = `${lines}ライン消去！`;
  updateBoardVisual();

  boardEl.querySelectorAll(".clear-burst").forEach((cell) => {
    cell.classList.remove("clear-burst");
  });
}

async function placePieceFromSlot(slotIndex, originX, originY) {
  if (gameOver || isResolvingTurn || slotIndex === null) return;

  const piece = pieceSlots[slotIndex];
  if (!piece) return;

  if (!isValidPlacement(piece, originX, originY)) {
    statusEl.textContent = "そこには置けません";
    return;
  }

  isResolvingTurn = true;

  piece.blocks.forEach(([dx, dy]) => {
    board[originY + dy][originX + dx] = 1;
  });

  score += piece.blocks.length;
  pieceSlots[slotIndex] = null;
  selectedSlot = null;
  draggingSlot = null;

  updateBoardVisual();
  await clearLines();
  refillPieces();
  renderPieces();
  updateScore();
  clearPreview();
  checkGameOver();

  isResolvingTurn = false;
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
  draggingSlot = null;
  gameOver = false;
  isResolvingTurn = false;
  statusEl.textContent = "";
  pieceSlots = Array.from({ length: SLOT_COUNT }, randomPiece);
  createBoard();
  renderPieces();
  updateBoardVisual();
  updateScore();
}

restartBtn.addEventListener("click", startGame);

startGame();
