/**
 * JavaScriptris v0.3 by Anders Hagward
 * Date: 2013-07-30
 *
 * The challenge was: how long time will it take to write a Tetris clone
 * stranded on a desolate island with only a laptop and an old smartphone,
 * equipped with a painfully slow and unreliable mobile internet connection and
 * barely basic JavaScript knowledge? The answer was: two evenings and one
 * morning.
 *
 * At first I used a list containing the locked g_blocks in order to be able to
 * render them more quickly (in contrast to looping through the 10*16 'g_blocks'
 * matrix), but maintaining the list when deleting rows showed to be a bit
 * tricky. I then reckoned that was a completely unnecessary optimization and
 * saved myself from the headache. The score system is from the original Tetris
 * but the level system is completely improvised.
 *
 * Enjoy this fun little project!
 */

var g_updateInterval = 1000;

var g_maxlevel = 10;
var g_ghostOpacity = '0.2';

var g_lineClearsPerAction = [1, 3, 5, 8];

// Determines whether to show the moving tetromino or not.
var g_running = true;
var g_paused = false;

var g_canvasLanded = document.getElementById('landedCanvas');
var g_canvasActive = document.getElementById('activeCanvas');
var g_canvasNext = document.getElementById('nextCanvas');
var g_contextLanded = g_canvasLanded.getContext('2d');
var g_contextActive = g_canvasActive.getContext('2d');
var g_contextNext = g_canvasNext.getContext('2d');

var g_scoreSpan = document.getElementById('score');
var g_levelSpan = document.getElementById('level');

// Block size.
var g_bsize = 30;

// Dimensions in #g_blocks.
var g_width = 10;
var g_height = 20;

g_canvasLanded.width = g_width * g_bsize;
g_canvasLanded.height = g_height * g_bsize;
g_canvasActive.width = g_canvasLanded.width;
g_canvasActive.height = g_canvasLanded.height;
g_canvasNext.width = g_bsize * 6;
g_canvasNext.height = g_bsize * 4;

// Adjust the position of the canvases.
g_canvasLanded.style.marginLeft = '-' + (g_canvasLanded.width / 2) + 'px';
g_canvasActive.style.marginLeft = g_canvasLanded.style.marginLeft;
g_canvasNext.style.marginLeft = '-' + (g_canvasLanded.width) + 'px';
document.getElementById('game').style.height = g_canvasLanded.height + 'px';
document.getElementById('scoreLevelContainer').style.width = g_canvasLanded.width + 'px';

var g_colors = [
	'rgba(51, 204, 204, 1.0)',	// cyan
    'rgba(255, 255, 51, 1.0)',	// yellow
    'rgba(204, 51, 153, 1.0)',	// purple
    'rgba(51, 102, 255, 1.0)',	// blue
    'rgba(255, 153, 51, 1.0)',	// orange
    'rgba(51, 204, 51, 1.0)',	// green
    'rgba(255, 51, 51, 1.0)'	// red
];
var g_ghostColors = [];
for (var i = 0; i < g_colors.length; i++)
    g_ghostColors.push(g_colors[i].replace('1.0', g_ghostOpacity));

// Contains all 19 fixed tetriminos. The first element in all lists is the
// pivot element that the other g_blocks rotate around.
var g_tetros = [
	[[[0,0],[-1,0],[1,0],[2,0]], [[0,0],[0,-1],[0,1],[0,2]]],			// I
	[[[0,0],[1,0],[0,-1],[1,-1]]],										// O
	[[[0,0],[-1,0],[1,0],[0,-1]], [[0,0],[0,-1],[0,1],[1,0]],			// T
			[[0,0],[-1,0],[1,0],[0,1]],	[[0,0],[0,-1],[0,1],[-1,0]]],
	[[[0,0],[-1,0],[1,0],[-1,-1]], [[0,0],[0,-1],[0,1],[1,-1]],			// J
			[[0,0],[-1,0],[1,0],[1,1]], [[0,0],[0,-1],[0,1],[-1,1]]],
	[[[0,0],[-1,0],[1,0],[1,-1]], [[0,0],[0,-1],[0,1],[1,1]],			// L
			[[0,0],[-1,0],[1,0],[-1,1]], [[0,0],[0,-1],[0,1],[-1,-1]]],
	[[[0,0],[0,1],[-1,1],[1,0]], [[0,0],[0,-1],[1,0],[1,1]]],			// S
	[[[0,0],[-1,0],[0,1],[1,1]], [[0,0],[0,1],[1,0],[1,-1]]]			// Z
];

// Initialize a two-dimensional array representing the board. A cell either has
// the value -1 (uninitialized) or an index from the array 'g_colors',
// representing a block of a certain color at that position.
var g_blocks = [];
resetAllBlocks();

// A value between 0-7 (see Tetromino enum).
var g_curTet, g_nextTet;

var g_x, g_y;
var g_xNext, g_yNext;

// Rotation (i.e. 'index in tetriminos array').
var g_r;

var g_score;
var g_level;
var g_lineClears;

var g_gameLoop;

// Start the game!
newGame();

/**
 * Key listener.
 */
document.onkeydown = function(e) {
	var keyCode = e.keyCode || e.which;
	if (g_paused && keyCode != 80)
		return;
	switch (keyCode) {
		case 37: // left
			e.preventDefault();
			if (canMoveLeft(g_curTet, g_x, g_y, g_r))
				g_x--;
			break;
		case 38: // up
			e.preventDefault();
			var newRot = -1;
			while ((newRot = canRotate(g_curTet, g_x, g_y, g_r)) == -2)
				g_y++;
			if (newRot != -1)
				g_r = newRot;
			break;
		case 39: // right
			e.preventDefault();
			if (canMoveRight(g_curTet, g_x, g_y, g_r))
				g_x++;
			break;
		case 40: // down
			e.preventDefault();
			update();
			break;
		case 32: // space
			e.preventDefault();
			hardDrop();
			break;
		case 80: // 'p'
			e.preventDefault();
			togglePaused();
			break;
		case 82: // 'r'
			e.preventDefault();
			newGame();
			break;
	}
	if (g_running && !g_paused)
		drawActive(true);
}

function canLand(tetro, x, y, rot) {
	for (var i = 0; i < 4; i++) {
		if (y + g_tetros[tetro][rot][i][1] >= g_height - 1 ||
				g_blocks[y+g_tetros[tetro][rot][i][1]+1]
					  [x+g_tetros[tetro][rot][i][0]] > -1)
			return true;
	}
	return false;
}

function canMoveLeft(tetro, x, y, rot) {
	for (var i = 0; i < 4; i++)
		if (x + g_tetros[tetro][rot][i][0] <= 0
				|| g_blocks[y+g_tetros[tetro][rot][i][1]]
						 [x+g_tetros[tetro][rot][i][0]-1] > -1)
			return false;
	return true;
}

function canMoveRight(tetro, x, y, rot) {
	for (var i = 0; i < 4; i++)
		if (x + g_tetros[tetro][rot][i][0] >= g_width - 1
				|| g_blocks[y+g_tetros[tetro][rot][i][1]]
						 [x+g_tetros[tetro][rot][i][0]+1] > -1)
			return false;
	return true;
}

function canRotate(tetro, x, y, rot) {
	var newRot = (rot + 1) % g_tetros[tetro].length;
	for (var i = 0; i < 4; i++) {
		var newY = y + g_tetros[tetro][newRot][i][1];
		if (newY < 0)
			return -2;
		var newX = x + g_tetros[tetro][newRot][i][0];
		if (newX < 0 || newX >= g_width || newY >= g_height
				|| g_blocks[newY][newX] > -1)
			return -1;
	}
	return newRot;
}

function canSpawn(tetro, x, y, rot) {
	for (var i = 0; i < 4; i++)
		if (g_blocks[y+g_tetros[tetro][rot][i][1]]
				  [x+g_tetros[tetro][rot][i][0]] > -1)
			return false;
	return true;
}

function deleteLines(lines) {
	// var newLine = [];
	// for (var i = 0; i < g_width; i++)
	// 	newLine.push(-1);

	for (var i = 0; i < lines.length; i++) {
		g_blocks.splice(lines[i], 1);
		g_blocks.unshift([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
	}
}

function drawActive(ghost) {
	g_canvasActive.width = g_canvasActive.width;
	g_contextActive.fillStyle = g_colors[g_curTet];

	g_contextActive.beginPath();
	for (var i = 0; i < 4; i++) {
		// Draw the current moving tetromino.
		g_contextActive.fillRect((g_x + g_tetros[g_curTet][g_r][i][0]) * g_bsize,
								 (g_y + g_tetros[g_curTet][g_r][i][1]) * g_bsize,
								 g_bsize, g_bsize);

		// Draw outline.
		g_contextActive.rect((g_x + g_tetros[g_curTet][g_r][i][0]) * g_bsize,
							 (g_y + g_tetros[g_curTet][g_r][i][1]) * g_bsize,
							 g_bsize, g_bsize);
	}
	g_contextActive.stroke();

	if (ghost) {
		var ghostY = getGhostYPosition(g_curTet, g_x, g_y, g_r);
		g_contextActive.fillStyle = g_ghostColors[g_curTet];
		for (var i = 0; i < 4; i++)
			g_contextActive.fillRect((g_x + g_tetros[g_curTet][g_r][i][0]) * g_bsize,
		        					 (ghostY + g_tetros[g_curTet][g_r][i][1]) * g_bsize,
		        					 g_bsize, g_bsize);
	}
}

function drawLanded() {
	g_canvasLanded.width = g_canvasLanded.width;

	g_contextLanded.beginPath();
	for (var i = 0; i < g_height; i++) {
		for (var j = 0; j < g_width; j++) {
			if (g_blocks[i][j] > -1) {
				g_contextLanded.fillStyle = g_colors[g_blocks[i][j]];
				
				// Draw tetromino.
				g_contextLanded.fillRect(j * g_bsize, i * g_bsize,
										 g_bsize, g_bsize);

				// Draw outline.
				g_contextLanded.rect(j * g_bsize, i * g_bsize,
									 g_bsize, g_bsize);
			}
		}
	}
	g_contextLanded.stroke();
}

function drawNext() {
	g_canvasNext.width = g_canvasNext.width;
	g_contextNext.fillStyle = g_colors[g_nextTet];

	// Draw the next tetromino in the center of its canvas.
	var nextTetX = (g_nextTet == 0) ? g_bsize : 2 * g_bsize;
	var nextTetY = (g_nextTet == 5 || g_nextTet == 6) ? g_bsize : 2 * g_bsize;
	g_contextNext.beginPath();
	for (var i = 0; i < 4; i++) {
		// Draw tetromino.
		g_contextNext.fillRect(nextTetX + g_tetros[g_nextTet][0][i][0] * g_bsize,
							   nextTetY + g_tetros[g_nextTet][0][i][1] * g_bsize,
							   g_bsize, g_bsize);

		// Draw outline.
		g_contextNext.rect(nextTetX + g_tetros[g_nextTet][0][i][0] * g_bsize,
						   nextTetY + g_tetros[g_nextTet][0][i][1] * g_bsize,
						   g_bsize, g_bsize);
	}
	g_contextNext.stroke();
}

function drawOverlay(colorBg, colorFg, text) {
	g_contextActive.fillStyle = colorBg;
	g_contextActive.fillRect(0, 0, g_canvasActive.width,
							 g_canvasActive.height);
	g_contextActive.fillStyle = colorFg;
	g_contextActive.font = 'bold 30pt Tahoma';
	g_contextActive.textAlign = 'center';
	g_contextActive.fillText(text, g_canvasActive.width / 2,
							 g_canvasActive.height / 2);
}

function gameOver() {
	clearInterval(g_gameLoop);
	g_running = false;
	drawOverlay('rgba(255, 0, 0, 0.3)', 'white', 'GAME OVER');
}

/**
 * Returns a list containing the indices of the complete rows.
 */
function getCompleteLines() {
	var completeLines = [];
	for (var i = 0; i < g_height; i++) {
		var complete = true;
		for (var j = 0; j < g_width; j++) {
			if (g_blocks[i][j] == -1) {
				complete = false;
				break;
			}
		}
		if (complete)
			completeLines.push(i);
	}
	return completeLines;
}

function getGhostYPosition(tetro, x, y, rot) {
    var ghostY = y;
    while (true) {
        for (var i = 0; i < 4; i++) {
            // If the block is colliding with the floor or another block:
            if (ghostY + g_tetros[tetro][rot][i][1] >= g_height - 1 ||
                    g_blocks[ghostY+g_tetros[tetro][rot][i][1]+1]
                    	  [x+g_tetros[tetro][rot][i][0]] > -1)
                return ghostY;
        }
        ghostY++;
    }
}

function getLevel(linesCleared) {
	return Math.floor(linesCleared / 5) + 1;
}

function getLineClears(numLines) {
	return g_lineClearsPerAction[numLines - 1];
}

/**
 * Returns the score awarded for deleting the specified rows.
 */
function getLinesScore(numLines, level) {
	return 100 * g_lineClearsPerAction[numLines - 1] * level;
}

/*
 * Returns a list containing a new random tetromino (i.e. a number in the range
 * [0, 6]), and a new x and y value.
 */
function getNewRandomTetromino() {
	var newTet = Math.floor(Math.random() * 7);

	// Place the tetromino in the middle or middle-left column, and just below
	// the ceiling.
	var newX = 4;
	var newY = 1;
	switch (newTet) {
		case 0:
		case 5:
		case 6:
			newY = 0;
			break;
	}

	return [newTet, newX, newY];
}

// Calls update() until the current tetromino reaches the bottom.
function hardDrop() {
	if (g_paused || !g_running)
		return;
	while (update());
}

function landTetromino(tetro, x, y, rot) {
	for (var i = 0; i < 4; i++) {
		var yIns = y + g_tetros[tetro][rot][i][1];
		var xIns = x + g_tetros[tetro][rot][i][0];
		g_blocks[yIns][xIns] = tetro;
	}
}

function newGame() {
	g_level = 1;
	g_score = 0;
	g_lineClears = 0;
	g_running = true;
	g_paused = false;

	resetAllBlocks();
	
	var newTet = getNewRandomTetromino();
	g_curTet = newTet[0];
	g_x = newTet[1];
	g_y = newTet[2];
	g_r = 0;

	newTet = getNewRandomTetromino();
	g_nextTet = newTet[0];
	g_xNext = newTet[1];
	g_yNext = newTet[2];

	clearInterval(g_gameLoop);
	g_gameLoop = setInterval(run, g_updateInterval);

	// Need to draw before first update for the first tetromino to appear at the
	// very top.
	drawActive(true);
	drawLanded();
	drawNext();

	g_scoreSpan.innerHTML = g_score;
	g_levelSpan.innerHTML = g_level;
}

/**
 * Clears all g_blocks and resizes the g_blocks array to fit the game dimensions if
 * needed.
 */
function resetAllBlocks() {
	for (var i = 0; i < g_height; i++) {
		if (g_blocks.length <= i)
			g_blocks.push([]);
		for (var j = 0; j < g_width; j++) {
			if (g_blocks[i].length <= j)
				g_blocks[i].push(-1);
			else
				g_blocks[i][j] = -1;
		}
	}
}

function run() {
	update();

	if (g_paused || !g_running)
		return;

	drawActive(true);
	drawNext();
}

function togglePaused() {
	// The game must be g_running to be pausable.
	if (!g_running) return;

	if (g_paused) {
		g_gameLoop = setInterval(run, g_updateInterval / g_level);
	} else {
		clearInterval(g_gameLoop);
		drawOverlay('rgba(0, 0, 255, 0.3)', 'white', 'PAUSED');
	}
	g_paused = !g_paused;
}

function touchesCeiling(tetro, y, rot) {
	for (var i = 0; i < 4; i++)
		if (y + g_tetros[tetro][rot][i][1] < 0)
			return true;
	return false;
}

// This function handles all the game logic. It updates the tetromino's
// position and checks for collisions.
function update() {
	if (g_paused || !g_running)
		return false;

	if (canLand(g_curTet, g_x, g_y, g_r)) {
		landTetromino(g_curTet, g_x, g_y, g_r);

		var completeLines = getCompleteLines();
		if (completeLines.length > 0) {
			g_lineClears += getLineClears(completeLines.length);
			g_score += getLinesScore(completeLines.length, g_level);
			g_scoreSpan.innerHTML = g_score;

			var newLevel = getLevel(g_lineClears);
			if (newLevel > g_level && newLevel <= g_maxlevel) {
				g_level = newLevel;
				clearInterval(g_gameLoop);
				g_gameLoop = setInterval(run, g_updateInterval / g_level);
				g_levelSpan.innerHTML = g_level;
			}

			deleteLines(completeLines);
		}

		if (!canSpawn(g_nextTet, g_xNext, g_yNext, 0)) {
			gameOver();
			return false;
		}

		g_curTet = g_nextTet;
		g_x = g_xNext;
		g_y = g_yNext;
		g_r = 0;

		var newTet = getNewRandomTetromino();
		g_nextTet = newTet[0];
		g_xNext = newTet[1];
		g_yNext = newTet[2];

		drawLanded();
		drawNext();
		return false;
	} else {
		g_y++;
		return true;
	}
}