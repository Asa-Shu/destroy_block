(function initGameLogic(globalObj) {
  const DEFAULT_GOALS = [100, 250, 500, 900, 1400];

  function findFullLines(board) {
    const size = board.length;
    const fullRows = [];
    const fullCols = [];

    for (let y = 0; y < size; y += 1) {
      if (board[y].every((cell) => cell === 1)) fullRows.push(y);
    }

    for (let x = 0; x < size; x += 1) {
      let isFull = true;
      for (let y = 0; y < size; y += 1) {
        if (board[y][x] !== 1) {
          isFull = false;
          break;
        }
      }
      if (isFull) fullCols.push(x);
    }

    return { fullRows, fullCols };
  }

  function calculateClearGain(lines, combo) {
    if (lines <= 0) return { nextCombo: 1, gained: 0 };

    const nextCombo = combo + 1;
    const comboBonus = (nextCombo - 1) * 8 * lines;
    const gained = lines * 25 + comboBonus;
    return { nextCombo, gained };
  }

  function getGoalProgress(score, goals = DEFAULT_GOALS) {
    const target = goals.find((goal) => score < goal) ?? goals[goals.length - 1];
    const previous = goals.filter((goal) => goal < target).at(-1) ?? 0;
    const denominator = target - previous || 1;
    const progress = Math.max(0, Math.min(1, (score - previous) / denominator));

    const text = score >= target
      ? `最終目標 ${target}pt クリア！さらにスコアを伸ばそう`
      : `次の目標: ${target}pt（あと ${Math.max(0, target - score)}pt）`;

    return { target, previous, progress, text };
  }

  const api = {
    DEFAULT_GOALS,
    findFullLines,
    calculateClearGain,
    getGoalProgress,
  };

  globalObj.GameLogic = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
