/**
 * JavaScriptrisOO by Anders Hagward
 * Date: 2013-07-14
 *
 * This is supposed to become a fully working object oriented port of
 * JavaScriptris.
 */

Keys = {
    LEFT : 97,
    RIGHT : 100,
    DOWN : 115,
    ROTATE: 119
}

var BLOCKS = [
    [[[0,0],[0,-1],[0,1],[0,2]], [[0,0],[-1,0],[1,0],[2,0]]],           // I
    [[[0,0],[1,0],[0,-1],[1,-1]]],                                      // O
    [[[0,0],[0,-1],[0,1],[1,0]], [[0,0],[-1,0],[1,0],[0,1]],            // T
            [[0,0],[0,-1],[0,1],[-1,0]], [[0,0],[-1,0],[1,0],[0,-1]]],
    [[[0,0],[0,-1],[0,1],[1,-1]], [[0,0],[-1,0],[1,0],[1,1]],           // J
            [[0,0],[0,-1],[0,1],[-1,1]], [[0,0],[-1,0],[1,0],[-1,-1]]],
    [[[0,0],[0,-1],[0,1],[1,1]], [[0,0],[-1,0],[1,0],[-1,1]],           // L
            [[0,0],[0,-1],[0,1],[-1,-1]], [[0,0],[-1,0],[1,0],[1,-1]]],
    [[[0,0],[0,-1],[1,0],[1,1]], [[0,0],[0,1],[-1,1],[1,0]]],           // S
    [[[0,0],[0,1],[1,0],[1,-1]], [[0,0],[-1,0],[0,1],[1,1]]]            // Z
];

var COLORS = ['cyan', 'yellow', 'purple', 'blue', 'orange', 'green', 'red'];

// Width and height in number of blocks.
var WIDTH = 10;
var HEIGHT = 30;

var keyDown = 0;

/**
 * An abstract class that will be the base for both the moving and landed
 * tetrominos.
 */
function Drawable {
    this.context = null;

    this.draw = function() {};
    this.move = function() {};
}

/**
 * Represents a Tetromino, i.e. four bricks, with methods for moving and
 * rotating.
 */
function Tetromino {
    this.type = 0; // 'I', 'O' etc; index in BLOCKS
    this.rot = 0; // rotation
    this.x = 0;
    this.y = 0;
    this.brickSize = 0;

    this.draw = function() {
        for (var i = 0; i < 4; i++)
            this.context.fillRect(BLOCKS[this.type][this.rot][0] + this.x,
                                  BLOCKS[this.type][this.rot][1] + this.y,
                                  this.brickSize,
                                  this.brickSize);
    };

    this.move = function() {
        switch (keyDown) {
        case Keys.LEFT:
            x--;
            break;
        case Keys.RIGHT:
            x++;
            break;
        case Keys.DOWN:
            y++;
            break;
        }
    };

    this.rotate = function() {
        this.rot = (this.rot + 1) % 7;
    };
}
Tetromino.prototype = new Drawable(); // let Tetromino inherit from Drawable

/**
 * A repository containing the blocks that have landed.
 */
function LandedRepository {
    this.modified = false; // we should only redraw if modified
    this.brickSize = 0;
    this.brickArray = [];
    for (var i = 0; i < HEIGHT; i++)
        this.brickArray.push([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);

    this.draw = function() {
        for (var i = 0; i < HEIGHT; i++) {
            for (var j = 0; j < WIDTH; j++) {
                var cell = brickArray[i][j];
                if (cell > -1) {
                    this.context.fillStyle = color;
                    this.context.fillRect(j * this.brickSize,
                                          i * this.brickSize,
                                          this.brickSize,
                                          this.brickSize);
                }
            }
        }
        this.modified = false;
    };

    this.isModified = function() {
        return this.modified;
    };
}
LandedRepository.prototype = new Drawable();

/*
function Player(width, height) {
    this.level = 0;
    this.score = 0;
    this.currTet = -1;
    this.nextTet = -1;
    this.x = 0;
    this.y = 0;
    this.blocks = [];
    for (var i = 0; i < height; i++) {
        blocks.push([]);
        for (var j = 0; j < width; j++)
            blocks[i].push(-1);
    }
    
    this.spawnTetromino = function() {
        if (nextTet < 0)
            nextTet = Math.floor(Math.random() * 7);
        currTet = nextTet;
        nextTet = Math.floor(Math.random() * 7);
        r = Math.floor(Math.random() * tetros[curTet].length);
        x = 4;
        y = 2;

        // Move the block just below the ceiling.
        for (var i = 0; i < 4; i++)
            if (tetros[curTet][r][i][Y] < y)
                y = tetros[curTet][r][i][Y];
        y *= -1;
    }
    
    this.moveLeft = function() {
        // if (state != GameState.Running) return;
        for (var i = 0; i < 4; i++)
            if (x + tetros[curTet][r][i][X] <= 0
                    || blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]-1] > -1)
                return false;
        x--;
        return true;
    }
    
    this.moveRight = function() {
    // if (state != GameState.Running) return;
        for (var i = 0; i < 4; i++)
            if (x + tetros[curTet][r][i][X] >= width - 1
                    || blocks[y+tetros[curTet][r][i][Y]][x+tetros[curTet][r][i][X]+1] > -1)
                return false;
        x++;
        return true;
    }

    this.rotate = function() {
        // if (state != GameState.Running) return;
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
}
*/

function Game() {
    this.landedCanvas = document.getElementById('landed');
    this.movingCanvas = document.getElementById('moving');

    // Return if canvas is not supported.
    if (!this.landedCanvas.getContext)
        return;

    this.landedContext = this.landedCanvas.getContext('2d');
    this.movingContext = this.movingCanvas.getContext('2d');
}
