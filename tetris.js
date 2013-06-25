/**
 * JavaScriptris v0.1 by Anders Hagward
 * Date: 2013-06-24
 *
 * The challenge was: how long time will it take to write a Tetris clone
 * stranded on a desolate island with only a laptop and an old smartphone,
 * equipped with a painfully slow and unreliable mobile internet connection and
 * barely basic JavaScript knowledge? The answer was: two evenings and one
 * morning.
 *
 * At first I used a list containing the locked blocks in order to be able to
 * render them more quickly (in contrast to looping through the 10*16 'grid'
 * matrix), but maintaining the list when deleting rows showed to be a bit
 * tricky. I then reckoned that was a completely unnecessary optimization and
 * saved myself from the headache. The score system is from the original Tetris
 * but the level system is completely improvised.
 *
 * It was a fun little project. Enjoy!
 */

var updateInterval = 1000;

// Constants for x and y indices in the block lists.
var X = 0;
var Y = 1;

var level = 0;
var maxLevel = 99;
var score = 0;
var rowScores = [40, 100, 300, 1200];

var monocolor = false;

// Contains all 19 fixed tetrominoes. The first element in all lists is the
// pivot element that the other blocks rotate around.
var tetros = [
	[[[0,0],[-1,0],[1,0],[2,0]], [[0,0],[0,-1],[0,1],[0,2]]],
	[[[0,0],[1,0],[1,1],[0,1]]],
	[[[0,0],[-1,0],[1,0],[0,1]], [[0,0],[0,-1],[0,1],[1,0]],
			[[0,0],[-1,0],[1,0],[0,-1]], [[0,0],[0,-1],[0,1],[-1,0]]],
	[[[0,0],[-1,0],[1,0],[1,1]], [[0,0],[0,-1],[0,1],[1,-1]],
			[[0,0],[-1,0],[1,0],[-1,-1]], [[0,0],[0,-1],[0,1],[-1,1]]],
	[[[0,0],[-1,0],[1,0],[-1,1]], [[0,0],[0,-1],[0,1],[1,1]],
			[[0,0],[-1,0],[1,0],[1,-1]], [[0,0],[0,-1],[0,1],[-1,-1]]],
	[[[0,0],[0,1],[-1,1],[1,0]], [[0,0],[0,-1],[1,0],[1,1]]],
	[[[0,0],[-1,0],[0,1],[1,1]], [[0,0],[0,1],[1,0],[1,-1]]]
]

// Determines whether to show the moving tetromino or not.
var running = true;
var paused = false;

Tetromino = {
	I : 0,
	O : 1,
	T : 2,
	J : 3,
	L : 4,
	S : 5,
	Z : 6
}

var colors = ['cyan', 'yellow', 'purple', 'blue', 'orange', 'green', 'red'];

var c = document.getElementById('a');
var ctx = c.getContext('2d');

// Block size.
var bsize = c.width / 10;

// Dimensions of the canvas in #blocks.
var width = c.width / bsize;
var height = c.height / bsize;

// Initialize a two-dimensional array representing the board. A cell either has
// the value -1 (uninitialized) or an index from the array 'colors',
// representing a block of a certain color at that position.
var grid = [];
for (var i = 0; i < height; i++) {
	grid.push([]);
	for (var j = 0; j < width; j++)
		grid[i].push(-1);
}

// A value between 0-7 (see Tetromino enum).
var curTet;

var x, y;

// Rotation (i.e. "index in tetrominoes array").
var r;

function moveLeft() {
	if (paused)
		return;
	
	for (var i = 0; i < 4; i++)
		if (x + tetros[curTet][r][i][X] <= 0
				|| grid[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]-1] > -1)
			return false;
	x--;
	return true;
}

function moveRight() {
	if (paused)
		return;
	
	for (var i = 0; i < 4; i++)
		if (x + tetros[curTet][r][i][X] >= width - 1
				|| grid[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]+1] > -1)
			return false;
	x++;
	return true;
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rotate() {
	if (paused)
		return;
	
	var newRot = (r + 1) % tetros[curTet].length;
	for (var i = 0; i < 4; i++) {
		var newX = x + tetros[curTet][newRot][i][X];
		var newY = y + tetros[curTet][newRot][i][Y];
		if (newX < 0 || newX >= width || newY < 0 || newY >= height
				|| grid[newY][newX] > -1)
			return false;
	}
	r = newRot;
	return true;
}

// Save the last moving blocks as 'locked' blocks.
function lockCurrent() {
	for (var i = 0; i < 4; i++)
		grid[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]] = curTet;
}

function checkRowsCompleted() {
	var n = 0;
	for (var i = 0; i < height; i++) {
		var complete = true;
		for (var j = 0; j < width; j++) {
			if (grid[i][j] == -1) {
				complete = false;
				break;
			}
		}
		if (complete) {
			console.log('removing row #' + i);
			
			// Remove the row and insert a new zero:ed one at the beginning.
			grid.splice(i, 1);
			grid.unshift([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]); // not too elegant...
			n++;
		}
	}
	
	// Update the score and (possibly) the level.
	if (n > 0) {
		score += rowScores[n-1] * (level + 1);
		
		// Home-crafted formula for levelling up...
		var newLevel = Math.floor(score/(200*(level+1)));
		if (newLevel > level) {
			console.log('new level: ' + level + ' -> ' + newLevel);
			level = (newLevel < maxLevel) ? newLevel : maxLevel;
			
			var newInterval = updateInterval - 30 * level;
			if (newInterval > 0) {
				console.log('new update interval: ' + updateInterval + ' -> ' + newInterval);
				updateInterval = newInterval;
				clearInterval(gameLoop);
				gameLoop = setInterval(run, updateInterval);
			}
		}
	}
}

function gameOver() {
	console.log('game over');
	clearInterval(gameLoop);
	running = false;
	// alert('Game over! Well played! Good game!');
}

function newTetromino() {
	curTet = getRandomInt(0, 6);
	console.log('new tetromino #' + curTet);
	r = getRandomInt(0, tetros[curTet].length-1);
	x = 4;
	y = 2;
	
	// Move the block just below the ceiling.
	for (var i = 0; i < 4; i++)
		if (tetros[curTet][r][i][Y] < y)
			y = tetros[curTet][r][i][Y];
	y *= -1;
	
	// Game over if the newly spawned tetromino starts on any old ones.
	for (var i = 0; i < 4; i++) {
		if (grid[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]] > -1) {
			gameOver();
			return;
		}
	}
}

function instaDrop() {
	if (paused)
		return;
	
	while (!update());
}

function togglePaused() {
	// The game must be running to be pausable.
	if (!running)
		return;
	
	if (paused)
		gameLoop = setInterval(run, updateInterval);
	else
		clearInterval(gameLoop);
	paused = !paused;
}

function update() {
	if (!running || paused)
		return;
	
	for (var i = 0; i < 4; i++) {
		if (y + tetros[curTet][r][i][Y] >= height - 1 ||
				grid[y+tetros[curTet][r][i][Y]+1][x+tetros[curTet][r][i][X]] > -1) {
			console.log('tetromino has landed!');
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
	c.width = c.width; // clear canvas
	
	// Draw the score.
	ctx.font = "bold 10pt Tahoma";
	ctx.fillText("Score: " + score, 8, 18);
	ctx.fillText("Level: " + level, c.width-60, 18);
	
	if (monocolor) ctx.fillStyle = 'black';
	
	// Draw the locked tetrominos.
	for (var i = 0; i < height; i++)
		for (var j = 0; j < width; j++)
			if (grid[i][j] > -1) {
				if (!monocolor) ctx.fillStyle = colors[grid[i][j]];
				ctx.fillRect(j*bsize, i*bsize, bsize, bsize);
			}
	
	// Draw the current moving tetromino.
	if (running) {
		if (!monocolor) ctx.fillStyle = colors[curTet];
		for (var i = 0; i < 4; i++)
			ctx.fillRect((x+tetros[curTet][r][i][X])*bsize,
					(y+tetros[curTet][r][i][Y])*bsize,
					bsize, bsize);
	} else { // Game over.
		ctx.fillStyle = (monocolor) ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 0, 0, 0.3)";
		ctx.fillRect(0, 0, c.width, c.height);
		ctx.fillStyle = "white";
		ctx.font = "bold 30pt Tahoma";
		ctx.fillText("GAME OVER", 30, 240);
	}
	
	if (paused) {
		ctx.fillStyle = (monocolor) ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 255, 0.3)";
		ctx.fillRect(0, 0, c.width, c.height);
		ctx.fillStyle = "white";
		ctx.font = "bold 30pt Tahoma";
		ctx.fillText("PAUSED", 70, 240);
	}
}

function run() {
	update();
	draw();
}

newTetromino();

// Need to draw before first update for the first tetromino to appear at the
// very top.
draw();

var gameLoop = setInterval(run, updateInterval);

document.onkeypress = function(e) {
	if (!running)
		return;
	
	switch (e.which) {
	case 97: // 'a'
		moveLeft();
		break;
	case 100: // 'd'
		moveRight();
		break;
	case 115: // 's'
		update(); // move down
		break;
	case 119: // 'w'
		rotate();
		break;
	case 32: // space
		instaDrop();
		break;
	case 112: // 'p'
		togglePaused();
		break;
	case 109: // 'm'
		monocolor = !monocolor;
		break;
	}
	draw();
}