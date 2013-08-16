/**
 * These functions are responsible for generating "fair" "random" tetrominos.
 * It is making sure that an 'I' tetromino comes at least every 12th round and
 *  that a maximum of four 'S' and 'Z' tetriminos can be spawned consecutively.
 */

var g_numTetros = [];
var g_prevQueue = [];

resetRandomSystem();

/**
 * Resets the queue and tetromino count array.
 */
function resetRandomSystem() {
    g_numTetros = [0, 0, 0, 0, 0, 0, 0];
    g_prevQueue.splice(0, g_prevQueue.length);
}

/**
 * Returns a new "random" tetromino and updates the queue.
 */
function getRandomTetromino() {
    var newTetromino;
    var len = g_prevQueue.length;

    if (g_numTetros[0] == 0 && len == 12) {
        // Make sure that we at least get one I each 12th time.
        newTetromino = 0;
    } else if (len >= 4
        && g_prevQueue[len-1] == g_prevQueue[len-2]
        && g_prevQueue[len-2] == g_prevQueue[len-3]
        && g_prevQueue[len-3] == g_prevQueue[len-4]
        && g_prevQueue[len-4] >= 5) {
        // If the four last tetriminos were 'S' or 'Z', spawn something else.
        newTetromino = Math.floor(Math.random() * 5);
    } else {
        newTetromino = Math.floor(Math.random() * 7);
    }
    pushTetromino(newTetromino);
    return newTetromino;
}

/**
 * Pushes a tetromino into the queue and updates g_numTetros to hold the
 * correct number of instances of the tetromino in the queue.
 */
function pushTetromino(tetromino) {
    g_numTetros[tetromino]++;
    // If the array is larger than 12, we remove the oldest element.
    if (g_prevQueue.length == 12) {
        g_numTetros[g_prevQueue[0]]--;
        g_prevQueue.shift();
    }
    g_prevQueue.push(tetromino);
}
