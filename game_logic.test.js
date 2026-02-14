const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findFullLines,
  calculateClearGain,
  getGoalProgress,
} = require('./game_logic');

test('findFullLines detects full row and column', () => {
  const board = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 0, 1],
  ];

  const { fullRows, fullCols } = findFullLines(board);
  assert.deepEqual(fullRows, [0]);
  assert.deepEqual(fullCols, [0, 2]);
});

test('calculateClearGain resets combo when no clear', () => {
  const result = calculateClearGain(0, 4);
  assert.equal(result.nextCombo, 1);
  assert.equal(result.gained, 0);
});

test('calculateClearGain applies combo bonus for cleared lines', () => {
  const result = calculateClearGain(2, 1);
  // nextCombo=2, base=50, bonus=(2-1)*8*2=16
  assert.equal(result.nextCombo, 2);
  assert.equal(result.gained, 66);
});

test('getGoalProgress returns next target and remaining text', () => {
  const progress = getGoalProgress(120, [100, 250, 500]);
  assert.equal(progress.target, 250);
  assert.match(progress.text, /あと 130pt/);
  assert.ok(progress.progress > 0);
});
