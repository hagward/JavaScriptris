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

var level = 0;
var maxLevel = 99;
var score = 0;
var rowScores = [40, 100, 300, 1200];

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
var height = 22;

c1.width = width * bsize;
c1.height = height * bsize;
c2.width = bsize * 6;
c2.height = bsize * 4;

c1.style.marginLeft = '-' + (c1.width / 2) + 'px';
c2.style.marginLeft = '-' + (c1.width) + 'px';
document.getElementById('game').style.height = c1.height + 'px';

var colors = [
	'#40FFFF',	// cyan
	'#FFFF40',	// yellow
	'#C030C0',	// purple
	'#4040FF',	// blue
	'#FF9F40',	// orange
	'#40FF40',	// green
	'#FF4040'	// red
];

// Constants for x and y indices in the block lists.
var X = 0;
var Y = 1;

// Contains all 19 fixed tetrominoes. The first element in all lists is the
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
for (var i = 0; i < height; i++) {
	blocks.push([]);
	for (var j = 0; j < width; j++)
		blocks[i].push(-1);
}

// A value between 0-7 (see Tetromino enum).
var curTet, nextTet;

var x, y;

// Rotation (i.e. "index in tetrominoes array").
var r;

var gameLoop;

// Start the game!
newGame();

function newGame() {
	level = 0;
	score = 0;
	running = true;
	paused = false;

	// Reset the block array.
	for (var i = 0; i < height; i++)
		for (var j = 0; j < width; j++)
			blocks[i][j] = -1;
	
	nextTet = Math.floor(Math.random() * 7);
	newTetromino();

	clearInterval(gameLoop);
	gameLoop = setInterval(run, updateInterval);

	// Need to draw before first update for the first tetromino to appear at the
	// very top.
	draw();
}

// Creates a new tetromino by setting the 'next' one as the current and
// generating a new 'next' tetromino.
function newTetromino() {
	curTet = nextTet;
	nextTet = Math.floor(Math.random() * 7);
	r = 0;

	// Place the tetromino in the middle or middle-left column, and just below
	// the ceiling.
	x = 4;
	switch (curTet) {
		case 0:
		case 5:
		case 6:
			y = 0;
			break;
		default:
			y = 1;
			break;
	}
	
	// Game over if the newly spawned tetromino starts on any old ones.
	for (var i = 0; i < 4; i++) {
		if (blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]] > -1) {
			gameOver();
			return;
		}
	}
}

function moveLeft() {
	if (paused || !running) return;
	for (var i = 0; i < 4; i++)
		if (x + tetros[curTet][r][i][X] <= 0
				|| blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]-1] > -1)
			return false;
	x--;
	return true;
}

function moveRight() {
	if (paused || !running) return;
	for (var i = 0; i < 4; i++)
		if (x + tetros[curTet][r][i][X] >= width - 1
				|| blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]+1] > -1)
			return false;
	x++;
	return true;
}

function rotate() {
	if (paused || !running) return;
	var newRot = (r + 1) % tetros[curTet].length;
	for (var i = 0; i < 4; i++) {
		var newX = x + tetros[curTet][newRot][i][X];
		var newY = y + tetros[curTet][newRot][i][Y];
		if (newX < 0 || newX >= width || newY < 0 || newY >= height
				|| blocks[newY][newX] > -1)
			return false;
	}
	r = newRot;
	return true;
}

// Save the last moving blocks as 'locked' blocks.
function lockCurrent() {
	for (var i = 0; i < 4; i++)
		blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]] = curTet;
}

// Checks for completed rows, deletes them and updates the score and level
// respectively. Should probably be broken up into smaller functions.
function checkRowsCompleted() {
	var n = 0;
	for (var i = 0; i < height; i++) {
		var complete = true;
		for (var j = 0; j < width; j++) {
			if (blocks[i][j] == -1) {
				complete = false;
				break;
			}
		}
		if (complete) {
			// Remove the row and insert a new zero:ed one at the beginning.
			blocks.splice(i, 1);
			var newLine = [];
			for (var i = 0; i < width; i++) newLine.push(-1);
			blocks.unshift(newLine); // not too elegant...
			n++;
		}
	}
	
	// Update the score and (possibly) the level.
	if (n > 0) {
		score += rowScores[n-1] * (level + 1);
		
		// Home-crafted formula for levelling up...
		var newLevel = Math.floor(score/(200*(level+1)));
		if (newLevel > level) {
			level = (newLevel < maxLevel) ? newLevel : maxLevel;
			
			var newInterval = updateInterval - 30 * level;
			if (newInterval > 0) {
				updateInterval = newInterval;
				clearInterval(gameLoop);
				gameLoop = setInterval(run, updateInterval);
			}
		}
	}
}

function gameOver() {
	clearInterval(gameLoop);
	running = false;
}

// Calls update() until the current tetromino reaches the bottom.
function instaDrop() {
	if (paused || !running) return;
	while (!update());
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
	if (paused || !running) return true;
	for (var i = 0; i < 4; i++) {
		if (y + tetros[curTet][r][i][Y] >= height - 1 ||
				blocks[y+tetros[curTet][r][i][Y]+1][x+tetros[curTet][r][i][X]] > -1) {
			lockCurrent();
			checkRowsCompleted();
			newTetromino();
			return true;
		}
	}
	y++;
	return false;
}

function draw() {
	// Clear the canvases.
	c1.width = c1.width;
	c2.width = c2.width;
	
	if (monochrome) ctx1.fillStyle = 'black';
	
	// Draw the locked tetrominos.
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

function run() {
	update();
	draw();
}

document.onkeydown = function(e) {
	var keyCode = e.keyCode || e.which;
	switch (keyCode) {
		case 37: // left
			e.preventDefault();
			moveLeft();
			break;
		case 38: // up
			e.preventDefault();
			rotate();
			break;
		case 39: // right
			e.preventDefault();
			moveRight();
			break;
		case 40: // down
			e.preventDefault();
			update();
			break;
		case 32: // space
			e.preventDefault();
			instaDrop();
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