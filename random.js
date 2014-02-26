/**
 * These functions are responsible for generating "fair" "random" tetriminos.
 * It is making sure that an 'I' tetrimino comes at least every 12th round and
 * that a maximum of four 'S' and 'Z' tetriminos can be spawned consecutively.
 */

var g_numTetros = [];
var g_prevQueue = [];

resetRandomSystem();

/**
 * Resets the queue and tetrimino count array.
 */
function resetRandomSystem() {
    g_numTetros = [0, 0, 0, 0, 0, 0, 0];
    g_prevQueue.splice(0, g_prevQueue.length);
}

/**
 * Returns a new "random" tetrimino and updates the queue.
 */
function getRandomTetrimino() {
    var newtetrimino;
    var len = g_prevQueue.length;

    if (g_numTetros[0] == 0 && len == 12) {
        // Make sure that we at least get one I each 12th time.
        newtetrimino = 0;
    } else if (len >= 4
        && (g_prevQueue[len-1] == 5 || g_prevQueue[len-1] == 6)
        && (g_prevQueue[len-2] == 5 || g_prevQueue[len-2] == 6)
        && (g_prevQueue[len-3] == 5 || g_prevQueue[len-3] == 6)
        && (g_prevQueue[len-4] == 5 || g_prevQueue[len-4] == 6)) {
        // If the four last tetriminos were 'S' or 'Z', spawn something else.
        newtetrimino = Math.floor(Math.random() * 5);
    } else {
        newtetrimino = Math.floor(Math.random() * 7);
    }
    pushTetrimino(newtetrimino);
    return newtetrimino;
}

/**
 * Pushes a tetrimino into the queue and updates g_numTetros to hold the
 * correct number of instances of the tetrimino in the queue.
 */
function pushTetrimino(tetrimino) {
    g_numTetros[tetrimino]++;
    // If the array is larger than 12, we remove the oldest element.
    if (g_prevQueue.length == 12) {
        g_numTetros[g_prevQueue[0]]--;
        g_prevQueue.shift();
    }
    g_prevQueue.push(tetrimino);
}
