/**
 * JavaScriptris v0.2.1 by Anders Hagward
 * Date: 2013-06-27
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

 // TODO: make (most of) the game variables arrays, indexable for P1 and P2.

var updateInterval = 1000;

var multiplayer = false;

// Constants for x and y indices in the block lists, and for players.
var X = 0;
var Y = 1;
var P1 = 0;
var P2 = 1;

Tetromino = {
    I : 0,
    O : 1,
    T : 2,
    J : 3,
    L : 4,
    S : 5,
    Z : 6
}

GameState = {
    Running : 0,
    Paused : 1,
    Waiting : 2,
    Gameover : 3,
    Gamewon : 4
}

var state = GameState.Waiting;

var maxLevel = 99;
var level = 0;
var score = 0;
var rowScores = [40, 100, 300, 1200];

var monochrome = false;

// Contains all 19 fixed tetrominoes. The first element in all lists is the
// pivot element that the other blocks rotate around.
var tetros = [
    [[[0,0],[0,-1],[0,1],[0,2]], [[0,0],[-1,0],[1,0],[2,0]]], // I
    [[[0,0],[1,0],[0,-1],[1,-1]]], // O
    [[[0,0],[0,-1],[0,1],[1,0]], [[0,0],[-1,0],[1,0],[0,1]], // T
            [[0,0],[0,-1],[0,1],[-1,0]], [[0,0],[-1,0],[1,0],[0,-1]]],
    [[[0,0],[0,-1],[0,1],[1,-1]], [[0,0],[-1,0],[1,0],[1,1]], // J
            [[0,0],[0,-1],[0,1],[-1,1]], [[0,0],[-1,0],[1,0],[-1,-1]]],
    [[[0,0],[0,-1],[0,1],[1,1]], [[0,0],[-1,0],[1,0],[-1,1]], // L
            [[0,0],[0,-1],[0,1],[-1,-1]], [[0,0],[-1,0],[1,0],[1,-1]]],
    [[[0,0],[0,-1],[1,0],[1,1]], [[0,0],[0,1],[-1,1],[1,0]]], // S
    [[[0,0],[0,1],[1,0],[1,-1]], [[0,0],[-1,0],[0,1],[1,1]]] // Z
]
var colors = ['cyan', 'yellow', 'purple', 'blue', 'orange', 'green', 'red'];

var mainCanvas = [
    document.getElementById('maincanvas_p1'),
    document.getElementById('maincanvas_p2')
];
var nextCanvas = [
    document.getElementById('nexttetrocanvas_p1'),
    document.getElementById('nexttetrocanvas_p2')
];
var mainContext = [
    mainCanvas[P1].getContext('2d'),
    mainCanvas[P2].getContext('2d')
];
var nextContext = [
    nextCanvas[P1].getContext('2d'),
    nextCanvas[P2].getContext('2d')
];

// Block size.
var bsize = mainCanvas[P1].width / 10;

// Dimensions of the canvas in #blocks.
var width = mainCanvas[P1].width / bsize;
var height = mainCanvas[P1].height / bsize;

// Initialize a two-dimensional array representing the board. A cell either has
// the value -1 (uninitialized) or an index from the array 'colors',
// representing a block of a certain color at that position.
var blocks = [], blocksP2 = [];
for (var i = 0; i < height; i++) {
    blocks.push([]);
    blocksP2.push([]);
    for (var j = 0; j < width; j++) {
        blocks[i].push(-1);
        blocksP2[i].push(-1);
    }
}

// A value between 0-7 (see Tetromino enum).
var curTet, nextTet;

var x, y;

// Rotation (i.e. "index in tetrominoes array").
var r;

var gameLoop;

function newGame() {
    level = 0;
    score = 0;
    
    state = GameState.Running;

    // Clear the block arrays.
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            blocks[i][j] = -1;
            blocksP2[i][j] = -1;
        }
    }

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
    r = Math.floor(Math.random() * tetros[curTet].length);
    x = 4;
    y = 2;

    // Move the block just below the ceiling.
    for (var i = 0; i < 4; i++)
        if (tetros[curTet][r][i][Y] < y)
            y = tetros[curTet][r][i][Y];
    y *= -1;

    // Game over if the newly spawned tetromino starts on any old ones.
    if (checkStartsWithCollision(blocks)) {
        gameOver();
        return;
    }

    socket.emit('newTetromino', {current: curTet, next: nextTet, rotation: r, x: x, y: y});
}

function moveLeft() {
    if (state != GameState.Running) return;
    for (var i = 0; i < 4; i++)
        if (x + tetros[curTet][r][i][X] <= 0
                || blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]-1] > -1)
            return false;
    x--;
    return true;
}

function moveRight() {
    if (state != GameState.Running) return;
    for (var i = 0; i < 4; i++)
        if (x + tetros[curTet][r][i][X] >= width - 1
                || blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]+1] > -1)
            return false;
    x++;
    return true;
}

function rotate() {
    if (state != GameState.Running) return;
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

    
    // Emit the locked blocks. Probably horribly inefficient, yeah?
    socket.emit('lockedBlocks', {blocks: blocks});
}

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
            // console.log('removing row #' + i);

            // Remove the row and insert a new zero:ed one at the beginning.
            blocks.splice(i, 1);
            blocks.unshift([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]); // not too elegant...
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
    state = GameState.Gameover;

    emitGameover();
}

// Calls update() until the current tetromino reaches the bottom.
function instaDrop() {
    if (state != GameState.Running) return;
    while (!update());
}

function togglePaused() {
    // The game must be running or be paused to be able to toggle.
    if (state == GameState.Running || state == GameState.Paused) {
        if (state == GameState.Paused) {
            gameLoop = setInterval(run, updateInterval);
            state = GameState.Running;
        } else {
            clearInterval(gameLoop);
            state = GameState.Paused;
        }
    }
}

// Checks if the newly spawned tetromino collides with previous ones.
function checkStartsWithCollision(b) {
    for (var i = 0; i < 4; i++)
        if (b[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]] > -1)
            return true;
    return false;
}

// This function handles all the game logic. It updates the tetromino's
// position and checks for collisions.
function update() {
    if (state != GameState.Running) return;
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

function clearCanvases() {
	mainCanvas[P1].width = mainCanvas[P1].width;
	mainCanvas[P2].width = mainCanvas[P2].width;
	nextCanvas[P1].width = nextCanvas[P1].width;
	nextCanvas[P2].width = nextCanvas[P2].width;
}

function draw() {
	clearCanvases();

	mainContext[P1].fillStyle = 'black';
    mainContext[P2].fillStyle = 'black';

    // Draw the locked tetrominos for P1 and P2.
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            if (blocks[i][j] > -1) {
                if (!monochrome) mainContext[P1].fillStyle = colors[blocks[i][j]];
                mainContext[P1].fillRect(j*bsize, i*bsize, bsize, bsize);
            }

            if (blocksP2[i][j] > -1) {
                if (!monochrome) mainContext[P2].fillStyle = colors[blocksP2[i][j]];
                mainContext[P2].fillRect(j*bsize, i*bsize, bsize, bsize);
            }

        }
    }

    switch (state) {
        case GameState.Running:
            if (!monochrome) mainContext[P1].fillStyle = colors[curTet];
            if (!monochrome) nextContext[P1].fillStyle = colors[nextTet];
            for (var i = 0; i < 4; i++) {
                // Draw the current moving tetromino.
                mainContext[P1].fillRect((x+tetros[curTet][r][i][X])*bsize,
                        (y+tetros[curTet][r][i][Y])*bsize,
                        bsize, bsize);
                // Draw the next tetromino.
                nextContext[P1].fillRect(bsize + tetros[nextTet][0][i][X]*bsize,
                        3*bsize + tetros[nextTet][0][i][Y]*bsize,
                        bsize, bsize);
            }
            break;
        case GameState.Waiting:
            // Waiting for other player to connect.
            mainContext[P1].fillStyle = (monochrome) ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 0, 255, 0.3)";
            mainContext[P1].fillRect(0, 0, mainCanvas[P1].width, mainCanvas[P1].height);
            mainContext[P1].fillStyle = "white";
            mainContext[P1].font = "bold 30pt Tahoma";
            mainContext[P1].fillText("WAITING", 60, 240);
            break;   
        case GameState.Gameover:
            // Game over.
            mainContext[P1].fillStyle = (monochrome) ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 0, 0, 0.3)";
            mainContext[P1].fillRect(0, 0, mainCanvas[P1].width, mainCanvas[P1].height);
            mainContext[P1].fillStyle = "white";
            mainContext[P1].font = "bold 30pt Tahoma";
            mainContext[P1].fillText("GAME OVER", 30, 240);
            break;
        case GameState.Paused:
            // Game paused
            mainContext[P1].fillStyle = (monochrome) ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 255, 0.3)";
            mainContext[P1].fillRect(0, 0, mainCanvas[P1].width, mainCanvas[P1].height);
            mainContext[P1].fillStyle = "white";
            mainContext[P1].font = "bold 30pt Tahoma";
            mainContext[P1].fillText("PAUSED", 70, 240);    
            break;

        case GameState.Gamewon:
            // Game won
            mainContext[P1].fillStyle = (monochrome) ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 255, 0, 0.3)";
            mainContext[P1].fillRect(0, 0, mainCanvas[P1].width, mainCanvas[P1].height);
            mainContext[P1].fillStyle = "white";
            mainContext[P1].font = "bold 30pt Tahoma";
            mainContext[P1].fillText("YOU WON", 60, 240);    
            break;
    }

    // Draw the score and level.
    mainContext[P1].fillStyle = 'black';
    mainContext[P1].font = "bold 10pt Tahoma";
    mainContext[P1].fillText("Score: " + score, 8, 18);
    mainContext[P1].fillText("Level: " + level, mainCanvas[P1].width-60, 18);
}

function run() {
    update();
    draw();
}

document.onkeypress = function(e) {
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
    case 114: // 'r'
        if (state = GameState.Running)
            newGame();
        break;
    case 109: // 'm'
        monochrome = !monochrome;
        break;
    }
    draw();
}

