/**
 * JavaScriptris v0.3 by Anders Hagward
 * Date: 2013-06-24
 * Last updated: 2013-08-16
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

var g_version = '0.3 beta 3';

var g_updateInterval = 1000;

var g_maxlevel = 12;
var g_ghostOpacity = '0.3';

var g_lineClearsPerAction = [1, 3, 5, 8];

// Determines whether to show the moving tetromino or not.
var g_running = true;
var g_paused = false;

var g_ghost = true;

var g_canvasActive = document.getElementById('activeCanvas');
var g_canvasLanded = document.getElementById('landedCanvas');
var g_canvasNext = document.getElementById('nextCanvas');
var g_contextActive = g_canvasActive.getContext('2d');
var g_contextLanded = g_canvasLanded.getContext('2d');
var g_contextNext = g_canvasNext.getContext('2d');

var g_scoreSpan = document.getElementById('score');
var g_levelSpan = document.getElementById('level');

// Block size.
var g_bsize = 30;

// Dimensions in #g_blocks.
var g_width = 10;
var g_height = 20;

var g_colors = [
    'rgba(51, 204, 204, 1.0)',  // cyan
    'rgba(255, 255, 51, 1.0)',  // yellow
    'rgba(204, 51, 153, 1.0)',  // purple
    'rgba(51, 102, 255, 1.0)',  // blue
    'rgba(255, 153, 51, 1.0)',  // orange
    'rgba(51, 204, 51, 1.0)',   // green
    'rgba(255, 51, 51, 1.0)'    // red
];
var g_ghostColors = [];

// Contains all 19 fixed tetriminos. The first element in all lists is the
// pivot element that the other g_blocks rotate around.
var g_tetros = [
    [[[0,0],[-1,0],[1,0],[2,0]], [[0,0],[0,-1],[0,1],[0,2]]],           // I
    [[[0,0],[1,0],[0,-1],[1,-1]]],                                      // O
    [[[0,0],[-1,0],[1,0],[0,-1]], [[0,0],[0,-1],[0,1],[1,0]],           // T
            [[0,0],[-1,0],[1,0],[0,1]], [[0,0],[0,-1],[0,1],[-1,0]]],
    [[[0,0],[-1,0],[1,0],[-1,-1]], [[0,0],[0,-1],[0,1],[1,-1]],         // J
            [[0,0],[-1,0],[1,0],[1,1]], [[0,0],[0,-1],[0,1],[-1,1]]],
    [[[0,0],[-1,0],[1,0],[1,-1]], [[0,0],[0,-1],[0,1],[1,1]],           // L
            [[0,0],[-1,0],[1,0],[-1,1]], [[0,0],[0,-1],[0,1],[-1,-1]]],
    [[[0,0],[0,1],[-1,1],[1,0]], [[0,0],[0,-1],[1,0],[1,1]]],           // S
    [[[0,0],[-1,0],[0,1],[1,1]], [[0,0],[0,1],[1,0],[1,-1]]]            // Z
];

// A two-dimensional array representing the board. A cell either has the value
// -1 (uninitialized) or an index from the array 'g_colors', representing a
// block of a certain color at that position.
var g_blocks = [];

// A value between 0-7.
var g_curTet, g_nextTet;

var g_x, g_y;
var g_xNext, g_yNext;

// Rotation (i.e. 'index in tetriminos array').
var g_r;

var g_score;
var g_level;
var g_lineClears;

var g_gameLoop;

g_canvasActive.width = g_width * g_bsize;
g_canvasActive.height = g_height * g_bsize;
g_canvasLanded.width = g_canvasActive.width;
g_canvasLanded.height = g_canvasActive.height;
g_canvasNext.width = g_bsize * 6;
g_canvasNext.height = g_bsize * 4;

document.getElementById('version').innerHTML = g_version;

// Adjust the position of the canvases.
g_canvasActive.style.marginLeft = '-' + (g_canvasLanded.width / 2) + 'px';
g_canvasLanded.style.marginLeft = g_canvasActive.style.marginLeft;
g_canvasNext.style.marginLeft = '-' + (g_canvasLanded.width) + 'px';
document.getElementById('game').style.height = g_canvasLanded.height + 'px';
document.getElementById('scoreLevelContainer').style.width = g_canvasLanded.width + 'px';

// Initialize the ghost colors with a smaller opacity.
for (var i = 0; i < g_colors.length; i++)
    g_ghostColors.push(g_colors[i].replace('1.0', g_ghostOpacity));

resetAllBlocks();
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
        case 71: // 'g'
            e.preventDefault();
            g_ghost = !g_ghost;
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
        drawActive(g_canvasActive, g_contextActive, g_ghost);
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

/**
 * Checks if the specified tetromino can rotate or not, and returns
 *     -2, if it collides with the ceiling,
 *     -1, if it collides with something else,
 * otherwise it returns the new rotation.
 */
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

/**
 * Returns true if the specified tetromino has the space to spawn, false
 * otherwise.
 */
function canSpawn(tetro, x, y, rot) {
    for (var i = 0; i < 4; i++)
        if (g_blocks[y+g_tetros[tetro][rot][i][1]]
                  [x+g_tetros[tetro][rot][i][0]] > -1)
            return false;
    return true;
}

/**
 * Deletes the lines with indices specified in 'lines'.
 */
function deleteLines(lines) {
    // For some unexplainable reason the following code has the effect that
    // updating a value in the block array will update several values:
    //     var newLine = [];
    //     for (var i = 0; i < g_width; i++)
    //         newLine.push(-1);

    for (var i = 0; i < lines.length; i++) {
        g_blocks.splice(lines[i], 1);
        // TODO: Make this less hardcoded.
        g_blocks.unshift([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
    }
}

/**
 * Clears the specified canvas and draws the current active tetromino on the
 * specified context. If 'ghost' is true, then it will also draw a ghost
 * tetromino at the ground.
 */
function drawActive(canvas, context, ghost) {
    canvas.width = canvas.width;
    context.fillStyle = g_colors[g_curTet];

    context.beginPath();
    for (var i = 0; i < 4; i++) {
        // Draw the current moving tetromino.
        context.fillRect((g_x + g_tetros[g_curTet][g_r][i][0]) * g_bsize,
                                 (g_y + g_tetros[g_curTet][g_r][i][1]) * g_bsize,
                                 g_bsize, g_bsize);

        // Draw outline.
        context.rect((g_x + g_tetros[g_curTet][g_r][i][0]) * g_bsize,
                             (g_y + g_tetros[g_curTet][g_r][i][1]) * g_bsize,
                             g_bsize, g_bsize);
    }
    context.stroke();

    if (ghost) {
        var ghostY = getGhostYPosition(g_curTet, g_x, g_y, g_r);
        context.fillStyle = g_ghostColors[g_curTet];
        for (var i = 0; i < 4; i++)
            context.fillRect((g_x + g_tetros[g_curTet][g_r][i][0]) * g_bsize,
                                     (ghostY + g_tetros[g_curTet][g_r][i][1]) * g_bsize,
                                     g_bsize, g_bsize);
    }
}

/**
 * Clears the specified canvas and draws the landed tetrominos on the specified
 * context.
 */
function drawLanded(canvas, context) {
    canvas.width = canvas.width;

    context.beginPath();
    for (var i = 0; i < g_height; i++) {
        for (var j = 0; j < g_width; j++) {
            if (g_blocks[i][j] > -1) {
                context.fillStyle = g_colors[g_blocks[i][j]];
                
                // Draw tetromino.
                context.fillRect(j * g_bsize, i * g_bsize,
                                         g_bsize, g_bsize);

                // Draw outline.
                context.rect(j * g_bsize, i * g_bsize,
                                     g_bsize, g_bsize);
            }
        }
    }
    context.stroke();
}

/**
 * Clears the specified canvas and draws the current next tetromino on the
 * specified context.
 */
function drawNext(canvas, context) {
    canvas.width = canvas.width;
    context.fillStyle = g_colors[g_nextTet];

    // Draw the next tetromino in the center of its canvas.
    var nextTetX = (g_nextTet == 0) ? g_bsize : 2 * g_bsize;
    var nextTetY = (g_nextTet == 5 || g_nextTet == 6) ? g_bsize : 2 * g_bsize;
    context.beginPath();
    for (var i = 0; i < 4; i++) {
        // Draw tetromino.
        context.fillRect(nextTetX + g_tetros[g_nextTet][0][i][0] * g_bsize,
                               nextTetY + g_tetros[g_nextTet][0][i][1] * g_bsize,
                               g_bsize, g_bsize);

        // Draw outline.
        context.rect(nextTetX + g_tetros[g_nextTet][0][i][0] * g_bsize,
                           nextTetY + g_tetros[g_nextTet][0][i][1] * g_bsize,
                           g_bsize, g_bsize);
    }
    context.stroke();
}

/**
 * Draws an overlay with the specified background and foreground color, and the
 * text centered.
 */
function drawOverlay(canvas, context, colorBg, colorFg, text) {
    context.fillStyle = colorBg;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = colorFg;
    context.font = 'bold 30pt Tahoma';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
}

/**
 * Removes the game loop and draws a 'game over' overlay.
 */
function gameOver() {
    clearInterval(g_gameLoop);
    g_running = false;
    drawOverlay(g_canvasActive, g_contextActive,
                'rgba(255, 0, 0, 0.3)', 'white', 'GAME OVER');
}

/**
 * Returns a list containing the indices of the current complete rows.
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

/**
 * Returns the y position for the ghost tetromino for the specified one.
 */
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

/**
 * Returns the level based on the specified number of lines cleared.
 */
function getLevel(linesCleared) {
    return Math.floor(linesCleared / 5) + 1;
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
    var newTet = getRandomTetromino();

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

/**
 * Immediately moves the current tetromino to the ground by repeatedly calling
 * update().
 */
function hardDrop() {
    if (g_paused || !g_running)
        return;
    while (update());
}

/**
 * Adds the blocks of the specified tetromino to the array of landed blocks.
 */
function landTetromino(tetro, x, y, rot) {
    for (var i = 0; i < 4; i++) {
        var yIns = y + g_tetros[tetro][rot][i][1];
        var xIns = x + g_tetros[tetro][rot][i][0];
        g_blocks[yIns][xIns] = tetro;
    }
}

/**
 * Resets all game variables, blocks, the game loop, and generates new random
 * 'current' and 'next' tetrominis.
 */
function newGame() {
    g_level = 1;
    g_score = 0;
    g_lineClears = 0;
    g_running = true;
    g_paused = false;

    resetAllBlocks();
    resetRandomSystem();
    
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
    drawActive(g_canvasActive, g_contextActive, g_ghost);
    drawLanded(g_canvasLanded, g_contextLanded);
    drawNext(g_canvasNext, g_contextNext);

    g_scoreSpan.innerHTML = g_score;
    g_levelSpan.innerHTML = g_level;
}

/**
 * Clears all blocks and resizes the g_blocks array to fit the game dimensions if
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

/**
 * Updates and draws the game and is called repeatedly by setInterval.
 */
function run() {
    update();

    if (g_paused || !g_running)
        return;

    drawActive(g_canvasActive, g_contextActive, g_ghost);
    drawNext(g_canvasNext, g_contextNext);
}

/**
 * Toggles if the game is paused or not, and if paused draws a 'paused'
 * overlay.
 */
function togglePaused() {
    // The game must be g_running to be pausable.
    if (!g_running) return;

    if (g_paused) {
        updateUpdateInterval();
    } else {
        clearInterval(g_gameLoop);
        drawOverlay(g_canvasActive, g_contextActive,
                    'rgba(0, 0, 255, 0.3)', 'white', 'PAUSED');
    }
    g_paused = !g_paused;
}

/**
 * Handles all the game logic; it checks if the current tetromino can land, and if so
 */
function update() {
    if (g_paused || !g_running)
        return false;

    if (canLand(g_curTet, g_x, g_y, g_r)) {
        landTetromino(g_curTet, g_x, g_y, g_r);

        var completeLines = getCompleteLines();
        if (completeLines.length > 0) {
            g_lineClears += g_lineClearsPerAction[completeLines.length - 1];
            g_score += getLinesScore(completeLines.length, g_level);
            g_scoreSpan.innerHTML = g_score;

            if (g_level < g_maxlevel) {
                var newLevel = getLevel(g_lineClears);
                if (newLevel > g_level) {
                    g_level = newLevel;
                    g_levelSpan.innerHTML = g_level;
                    updateUpdateInterval();
                }
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

        drawLanded(g_canvasLanded, g_contextLanded);
        drawNext(g_canvasNext, g_contextNext);
        return false;
    } else {
        g_y++;
        return true;
    }
}

/**
 * Clears the current interval and sets a new one based on the current level.
 */
function updateUpdateInterval() {
    clearInterval(g_gameLoop);
    g_gameLoop = setInterval(run, g_updateInterval / (0.5 * g_level));
}
