/**
 * JavaScriptris v0.2.2 by Anders Hagward
 * Date: 2013-07-14
 *
 * The challenge was: how long time will it take to write a Tetris clone
 * stranded on a desolate island with only a laptop and an old smartphone,
 * equipped with a painfully slow and unreliable mobile internet connection and
 * barely basic JavaScript knowledge? The answer was: two evenings and one
 * morning.
 *
 * At first I used a list containing the locked blocks in order to be able to
 * render them more quickly (in contrast to looping through the 10*16 'blocks'
 * matrix), but maintaining the list when deleting rows showed to be a bit
 * tricky. I then reckoned that was a completely unnecessary optimization and
 * saved myself from the headache. The score system is from the original Tetris
 * but the level system is completely improvised.
 *
 * Enjoy this fun little project!
 */

var updateInterval = 1000;

var maxLevel = 10;
var ghostOpacity = '0.2';

var lineClearsPerAction = [1, 3, 5, 8];

var monochrome = false;

// Determines whether to show the moving tetromino or not.
var running = true;
var paused = false;

var c1 = document.getElementById('maincanvas');
var c2 = document.getElementById('nexttetrocanvas');
var ctx1 = c1.getContext('2d');
var ctx2 = c2.getContext('2d');

// Block size.
var bsize = 30;

// Dimensions in #blocks.
var width = 10;
var height = 20;

c1.width = width * bsize;
c1.height = height * bsize;
c2.width = bsize * 6;
c2.height = bsize * 4;

// Adjust the position of the canvases.
c1.style.marginLeft = '-' + (c1.width / 2) + 'px';
c2.style.marginLeft = '-' + (c1.width) + 'px';
document.getElementById('game').style.height = c1.height + 'px';

var colors = [
	'rgba(51, 204, 204, 1.0)',	// cyan
    'rgba(255, 255, 51, 1.0)',	// yellow
    'rgba(204, 51, 153, 1.0)',	// purple
    'rgba(51, 102, 255, 1.0)',	// blue
    'rgba(255, 153, 51, 1.0)',	// orange
    'rgba(51, 204, 51, 1.0)',	// green
    'rgba(255, 51, 51, 1.0)'	// red
];
var ghostColors = [];
for (var i = 0; i < colors.length; i++)
    ghostColors.push(colors[i].replace('1.0', ghostOpacity));

// Constants for x and y indices in the block lists.
var X = 0;
var Y = 1;

// Contains all 19 fixed tetriminos. The first element in all lists is the
// pivot element that the other blocks rotate around.
var tetros = [
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
// the value -1 (uninitialized) or an index from the array 'colors',
// representing a block of a certain color at that position.
var blocks = [];
resetAllBlocks();

// A value between 0-7 (see Tetromino enum).
var curTet, nextTet;

var x, y;
var xNext, yNext;

// Rotation (i.e. "index in tetriminos array").
var r;

var score;
var level;
var lineClears;

var gameLoop;

// Start the game!
newGame();

/**
 * Key listener.
 */
document.onkeydown = function(e) {
	var keyCode = e.keyCode || e.which;
	switch (keyCode) {
		case 37: // left
			e.preventDefault();
			if (canMoveLeft(curTet, x, y, r))
				x--;
			break;
		case 38: // up
			e.preventDefault();
			if (canRotate(curTet, x, y, r))
				r = (r + 1) % tetros[curTet].length;
			break;
		case 39: // right
			e.preventDefault();
			if (canMoveRight(curTet, x, y, r))
				x++;
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
		case 77: // 'm'
			e.preventDefault();
			monochrome = !monochrome;
			break;
	}
	draw();
}

function canLand(tetromino, x, y, rotation) {
	for (var i = 0; i < 4; i++) {
		if (y + tetros[tetromino][rotation][i][Y] >= height - 1 ||
				blocks[y+tetros[tetromino][rotation][i][Y]+1]
					  [x+tetros[tetromino][rotation][i][X]] > -1)
			return true;
	}
	return false;
}

function canMoveLeft(tetromino, x, y, rotation) {
	for (var i = 0; i < 4; i++)
		if (x + tetros[tetromino][rotation][i][X] <= 0
				|| blocks[y+tetros[tetromino][rotation][i][Y]]
						 [x+tetros[tetromino][rotation][i][X]-1] > -1)
			return false;
	return true;
}

function canMoveRight(tetromino, x, y, rotation) {
	for (var i = 0; i < 4; i++)
		if (x + tetros[tetromino][rotation][i][X] >= width - 1
				|| blocks[y+tetros[tetromino][rotation][i][Y]]
						 [x+tetros[tetromino][rotation][i][X]+1] > -1)
			return false;
	return true;
}

function canRotate(tetromino, x, y, rotation) {
	var newRot = (rotation + 1) % tetros[tetromino].length;
	for (var i = 0; i < 4; i++) {
		var newX = x + tetros[tetromino][newRot][i][X];
		var newY = y + tetros[tetromino][newRot][i][Y];
		if (newX < 0 || newX >= width || newY < 0 || newY >= height
				|| blocks[newY][newX] > -1)
			return false;
	}
	return true;
}

function canSpawn(tetromino, x, y, rotation) {
	for (var i = 0; i < 4; i++)
		if (blocks[y+tetros[tetromino][rotation][i][Y]]
				  [x+tetros[tetromino][rotation][i][X]] > -1)
			return false;
	return true;
}

function deleteLines(lines) {
	var newLine = [];
	for (var i = 0; i < width; i++)
		newLine.push(-1);

	for (var i = 0; i < lines.length; i++) {
		blocks.splice(lines[i], 1);
		blocks.unshift(newLine);
	}
}

function draw() {
	// Clear the canvases.
	c1.width = c1.width;
	c2.width = c2.width;
	
	if (monochrome) ctx1.fillStyle = 'black';
	
	// Draw the locked tetriminos.
	for (var i = 0; i < height; i++)
		for (var j = 0; j < width; j++)
			if (blocks[i][j] > -1) {
				if (!monochrome) ctx1.fillStyle = colors[blocks[i][j]];
				ctx1.fillRect(j*bsize, i*bsize, bsize, bsize);
			}
	
	if (running) {
		if (!monochrome) ctx1.fillStyle = colors[curTet];
		if (!monochrome) ctx2.fillStyle = colors[nextTet];
		for (var i = 0; i < 4; i++) {
			// Draw the current moving tetromino.
			ctx1.fillRect((x+tetros[curTet][r][i][X])*bsize,
					(y+tetros[curTet][r][i][Y])*bsize,
					bsize, bsize);

			// Draw the next tetromino in the center of its canvas.
			var nextTetX = (nextTet == 0) ? bsize : 2 * bsize;
			var nextTetY = (nextTet == 5 || nextTet == 6) ? bsize : 2 * bsize;
			ctx2.fillRect(nextTetX + tetros[nextTet][0][i][X]*bsize,
					nextTetY + tetros[nextTet][0][i][Y]*bsize,
					bsize, bsize);
		}

		// Draw the ghost tetromino.
		var ghostY = getGhostYPosition(curTet, x, y, r);
		ctx1.fillStyle = (monochrome) ? 'rgba(0, 0, 0, ' + ghostOpacity + ')'
				: ghostColors[curTet];
		for (var i = 0; i < 4; i++)
			ctx1.fillRect((x+tetros[curTet][r][i][X])*bsize,
            	(ghostY+tetros[curTet][r][i][Y])*bsize,
            	bsize, bsize);
	} else {
		// Game over.
		ctx1.fillStyle = (monochrome) ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 0, 0, 0.3)";
		ctx1.fillRect(0, 0, c1.width, c1.height);
		ctx1.fillStyle = "white";
		ctx1.font = "bold 30pt Tahoma";
		ctx1.fillText("GAME OVER", 30, 240);
	}
	
	if (paused) {
		ctx1.fillStyle = (monochrome) ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 255, 0.3)";
		ctx1.fillRect(0, 0, c1.width, c1.height);
		ctx1.fillStyle = "white";
		ctx1.font = "bold 30pt Tahoma";
		ctx1.fillText("PAUSED", 70, 240);
	}

	// Draw the score and level.
	ctx1.fillStyle = 'black';
	ctx1.font = "bold 10pt Tahoma";
	ctx1.fillText("Score: " + score, 8, 18);
	ctx1.fillText("Level: " + level, c1.width-60, 18);
}

/**
 * Returns a list containing the indices of the complete rows.
 */
function getCompleteLines() {
	var completeLines = [];
	for (var i = 0; i < height; i++) {
		var complete = true;
		for (var j = 0; j < width; j++) {
			if (blocks[i][j] == -1) {
				complete = false;
				break;
			}
		}
		if (complete)
			completeLines.push(i);
	}
	return completeLines;
}

function getGhostYPosition(tetromino, x, y, rotation) {
    var ghostY = y;
    while (true) {
        for (var i = 0; i < 4; i++) {
            // If the block is colliding with the floor or another block:
            if (ghostY + tetros[tetromino][rotation][i][Y] >= height - 1 ||
                    blocks[ghostY+tetros[tetromino][rotation][i][Y]+1]
                    	  [x+tetros[tetromino][rotation][i][X]] > -1)
                return ghostY;
        }
        ghostY++;
    }
}

function getLevel(linesCleared) {
	return Math.floor(linesCleared / 5) + 1;
}

function getLineClears(numLines) {
	return lineClearsPerAction[numLines - 1];
}

/**
 * Returns the score awarded for deleting the specified rows.
 */
function getLinesScore(numLines, level) {
	return 100 * lineClearsPerAction[numLines - 1] * level;
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
	if (paused || !running)
		return;
	while (update());
}

function landTetromino(tetromino, x, y, rotation) {
	for (var i = 0; i < 4; i++)
		blocks[y+tetros[tetromino][rotation][i][Y]]
			  [x+tetros[tetromino][rotation][i][X]] = tetromino;
}

function newGame() {
	level = 1;
	score = 0;
	lineClears = 0;
	running = true;
	paused = false;

	resetAllBlocks();
	
	var newTet = getNewRandomTetromino();
	curTet = newTet[0];
	x = newTet[1];
	y = newTet[2];
	r = 0;

	newTet = getNewRandomTetromino();
	nextTet = newTet[0];
	xNext = newTet[1];
	yNext = newTet[2];

	clearInterval(gameLoop);
	gameLoop = setInterval(run, updateInterval);

	// Need to draw before first update for the first tetromino to appear at the
	// very top.
	draw();
}

/**
 * Clears all blocks and resizes the blocks array to fit the game dimensions if
 * needed.
 */
function resetAllBlocks() {
	for (var i = 0; i < height; i++) {
		if (blocks.length <= i)
			blocks.push([]);
		for (var j = 0; j < width; j++) {
			if (blocks[i].length <= j)
				blocks[i].push(-1);
			else
				blocks[i][j] = -1;
		}
	}
}

function run() {
	update();
	draw();
}

function togglePaused() {
	// The game must be running to be pausable.
	if (!running) return;

	if (paused)
		gameLoop = setInterval(run, updateInterval);
	else
		clearInterval(gameLoop);
	paused = !paused;
}

// This function handles all the game logic. It updates the tetromino's
// position and checks for collisions.
function update() {
	if (paused || !running)
		return false;

	if (canLand(curTet, x, y, r)) {
		landTetromino(curTet, x, y, r);

		var completeLines = getCompleteLines();
		if (completeLines.length > 0) {
			lineClears += getLineClears(completeLines.length);
			score += getLinesScore(completeLines.length, level);

			var newLevel = getLevel(lineClears);
			if (newLevel != level) {
				level = newLevel;
				clearInterval(gameLoop);
				gameLoop = setInterval(run, updateInterval / level);
			}

			deleteLines(completeLines);
		}

		if (!canSpawn(nextTet, xNext, yNext, 0)) {
			running = false;
			return false;
		}

		curTet = nextTet;
		x = xNext;
		y = yNext;
		r = 0;

		var newTet = getNewRandomTetromino();
		nextTet = newTet[0];
		xNext = newTet[1];
		yNext = newTet[2];
		return false;
	} else {
		y++;
		return true;
	}
}