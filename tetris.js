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

var startingUpdateInterval = 1000;

var updateInterval = 1000;
var updateIntervalP2 = 1000;

// Constants for x and y indices in the block lists, and for players.
var X = 0;
var Y = 1;
var P1 = 0;
var P2 = 1;

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
var levelP2 = 0;
var score = 0;
var scoreP2 = 0;
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
];

// Contains the color for each tetromino. Note that the opacity must be written
// out because it is needed for the transparent 'ghost' tetrominos.
var colors = [
    'rgba(51, 204, 204, 1.0)', // cyan
    'rgba(255, 255, 51, 1.0)', // yellow
    'rgba(204, 51, 153, 1.0)', // purple
    'rgba(51, 102, 255, 1.0)', // blue
    'rgba(255, 153, 51, 1.0)', // orange
    'rgba(51, 204, 51, 1.0)', // green
    'rgba(255, 51, 51, 1.0)' // red
];
var ghostColors = [];
for (var i = 0; i < colors.length; i++)
    ghostColors.push(colors[i].replace('1.0', '0.2'));

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
var curTetP2 = 0, nextTetP2 = 0;

var x, y;
var xP2 = 0, yP2 = 0;

// Rotation (i.e. "index in tetrominoes array").
var r;
var rP2 = 0;

var gameLoop, gameLoopP2;

function newGame() {
    level = 0;
    score = 0;
    levelP2 = 0;
    scoreP2 = 0;

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
    clearInterval(gameLoopP2);
    gameLoop = setInterval(run, updateInterval);
    gameLoopP2 = setInterval(updateP2, updateIntervalP2);

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

    socket.emit('gameMessage', {type: MessageType.NewTetrominoMessage, 
            current: curTet, next: nextTet, rotation: r, xPos: x, yPos: y});
}

function moveLeft() {
    if (state != GameState.Running) return;
    for (var i = 0; i < 4; i++)
        if (x + tetros[curTet][r][i][X] <= 0
                || blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]-1] > -1)
            return false;
    x--;
    socket.emit('gameMessage', {type: MessageType.MoveLeftMessage});
    return true;
}

function moveRight() {
    if (state != GameState.Running) return;
    for (var i = 0; i < 4; i++)
        if (x + tetros[curTet][r][i][X] >= width - 1
                || blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]+1] > -1)
            return false;
    x++;
    socket.emit('gameMessage', {type: MessageType.MoveRightMessage});
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
    socket.emit('gameMessage', {type: MessageType.RotateMessage, rotation: r});
    return true;
}

// Save the last moving blocks as 'locked' blocks.
function lockCurrent() {
    for (var i = 0; i < 4; i++)
        blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]] = curTet;
    
    // Emit the locked blocks. Probably horribly inefficient, yeah?
    socket.emit('gameMessage', {type: MessageType.LockBlocksMessage, blocks: blocks});
}

function checkRowsCompleted() {
    var n = 0; // number of deleted rows
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
            blocks.unshift([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]); // not too elegant...
            n++;

            socket.emit('gameMessage', {type: MessageType.DeleteRowMessage, row: i});
        }
    }

    // Update the score and (possibly) the level.
    if (n > 0) {

        // Cleared some lines!
        addClearedLines(true,n);

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
                socket.emit('gameMessage', {type: MessageType.LevelMessage, level: level, interval: updateInterval});
            }
        }
        socket.emit('gameMessage', {type: MessageType.ScoreMessage, score: score});
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

// Checks if the newly spawned tetromino collides with previous ones.
function checkStartsWithCollision(b) {
    for (var i = 0; i < 4; i++)
        if (b[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]] > -1)
            return true;
    return false;
}

function getGhostYPosition() {
    if (state != GameState.Running) return;
    var ghostY = y;
    while (true) {
        for (var i = 0; i < 4; i++) {
            // If the block is colliding with the floor or another block:
            if (ghostY + tetros[curTet][r][i][Y] >= height - 1 ||
                    blocks[ghostY+tetros[curTet][r][i][Y]+1][x+tetros[curTet][r][i][X]] > -1)
                return ghostY;
        }
        ghostY++;
    }
}

// This function handles all the game logic. It updates the tetromino's
// position and checks for collisions.
function update() {
    if (state != GameState.Running) return true;
    for (var i = 0; i < 4; i++) {
        // If the block is colliding with the floor or another block:
        if (y + tetros[curTet][r][i][Y] >= height - 1 ||
                blocks[y+tetros[curTet][r][i][Y]+1][x+tetros[curTet][r][i][X]] > -1) {
            lockCurrent();
            checkRowsCompleted();
            newTetromino();
            return true;
        }
    }
    y++;
    
    // Check rules depending on game type.
    checkGameTypeRules();
    return false;
}

function updateP2() {
    yP2++;
}

function clearCanvases(player) {
	mainCanvas[player].width = mainCanvas[player].width;
	nextCanvas[player].width = nextCanvas[player].width;
}

function drawTransparentTextBox(player, color, text, xPos) {
    mainContext[player].fillStyle = (monochrome) ? "rgba(0, 0, 0, 0.3)" : color;
    mainContext[player].fillRect(0, 0, mainCanvas[player].width, mainCanvas[player].height);
    mainContext[player].fillStyle = "white";
    mainContext[player].font = "bold 30pt Tahoma";
    mainContext[player].fillText(text, xPos, 240);
}

function drawScoreAndLevel(player) {
    mainContext[player].fillStyle = 'black';
    mainContext[player].font = "bold 10pt Tahoma";
    mainContext[player].fillText("Score: " + ((player == P1) ? score : scoreP2), 8, 18);
    mainContext[player].fillText("Level: " + ((player == P1) ? level : levelP2), mainCanvas[player].width-60, 18);
}

function draw() {
	clearCanvases(P1);
    clearCanvases(P2);

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
        // Draw the 'ghost' tetromino, i.e. the one showing where the current
        // tetromino is about to drop.
        var ghostY = getGhostYPosition();
        mainContext[P1].fillStyle = (monochrome) ? 'rgba(0, 0, 0, 0.5)' : ghostColors[curTet];
        for (var i = 0; i < 4; i++)
            mainContext[P1].fillRect((x+tetros[curTet][r][i][X])*bsize,
                (ghostY+tetros[curTet][r][i][Y])*bsize,
                bsize, bsize);

        if (!monochrome) {
            mainContext[P1].fillStyle = colors[curTet];
            nextContext[P1].fillStyle = colors[nextTet];
            mainContext[P2].fillStyle = colors[curTetP2];
            nextContext[P2].fillStyle = colors[nextTetP2];
        } else {
            // Restore the opacity.
            mainContext[P1].fillStyle = 'rgba(0, 0, 0, 1.0)';
        }

        for (var i = 0; i < 4; i++) {
            // Draw the current moving tetromino.
            mainContext[P1].fillRect((x+tetros[curTet][r][i][X])*bsize,
                    (y+tetros[curTet][r][i][Y])*bsize,
                    bsize, bsize);

            // Draw the next tetromino.
            nextContext[P1].fillRect(bsize + tetros[nextTet][0][i][X]*bsize,
                    3*bsize + tetros[nextTet][0][i][Y]*bsize,
                    bsize, bsize);

            // And for P2.
            mainContext[P2].fillRect((xP2+tetros[curTetP2][rP2][i][X])*bsize,
                    (yP2+tetros[curTetP2][rP2][i][Y])*bsize,
                    bsize, bsize);
            nextContext[P2].fillRect(bsize + tetros[nextTetP2][0][i][X]*bsize,
                    3*bsize + tetros[nextTetP2][0][i][Y]*bsize,
                    bsize, bsize);
        }
        break;
    case GameState.Waiting:
        // Waiting for other player to connect.
        drawTransparentTextBox(P1, "rgba(255, 0, 255, 0.3)", "WAITING", 55);
        drawTransparentTextBox(P2, "rgba(255, 0, 255, 0.1)", "", 55);
        break;   
    case GameState.Gameover:
        // Game over.
        drawTransparentTextBox(P1, "rgba(255, 0, 0, 0.3)", "YOU LOSE", 50);
        drawTransparentTextBox(P2, "rgba(0, 255, 0, 0.3)", "", 50);
        break;
    case GameState.Paused:
        // Game paused.
        drawTransparentTextBox(P1, "rgba(0, 0, 255, 0.3)", "PAUSED", 70);
        drawTransparentTextBox(P2, "rgba(0, 0, 255, 0.3)", "", 70);
        break;
    case GameState.Gamewon:
        // Game won.
        drawTransparentTextBox(P1, "rgba(0, 255, 0, 0.3)", "YOU WIN", 50);
        drawTransparentTextBox(P2, "rgba(255, 0, 0, 0.3)", "", 50);
        break;
    }

    drawScoreAndLevel(P1);
    drawScoreAndLevel(P2);
}

function run() {
    update();
    draw();
}

var chatBox = document.getElementById('message');
document.onkeydown = function(e) {
    var keyCode = e.keyCode || e.which;

    // Make sure that the keystrokes aren't handled if the user is writing a
    // a message. Let the user switch between the chat box and the game by
    // pressing the tab character.
    var curElement = document.activeElement;
    if (keyCode == 9) {
        e.preventDefault();
        if (curElement == chatBox)
            chatBox.blur();
        else
            chatBox.focus();
        return;
    } else if (curElement == chatBox)
        return;

    e.preventDefault();

    switch (keyCode) {
    case 37: // 'a'
        moveLeft();
        break;
    case 38: // 'w'
        rotate();
        break;
    case 39: // 'd'
        moveRight();
        break;
    case 40: // 's'
        update(); // move down
        socket.emit('gameMessage', {type: MessageType.MoveDownMessage});
        break;
    case 32: // space
        instaDrop();
        break;
    case 80: // 'p'
        emitPauseToggle();
        break;
    case 77: // 'm'
        monochrome = !monochrome;
        break;
    }
    draw();
}
