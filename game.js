function Game() {
	var that = this; // True story.
    this.landedCanvas = document.getElementById('landed');
    this.movingCanvas = document.getElementById('moving');

    // Return if canvas is not supported.
    if (!this.landedCanvas.getContext)
        return;

    this.landedContext = this.landedCanvas.getContext('2d');
    this.movingContext = this.movingCanvas.getContext('2d');

    LandedRepository.prototype.context = this.landedContext;
    Tetromino.prototype.context = this.movingContext;

    this.currentBlock = new Tetromino();
    this.currentBlock.initRandom();
    this.currentBlock.draw();

    this.gameInterval;

    this.run = function() {
    	this.gameInterval = setInterval(update, 1000);
    };

    this.pause = function() {
    	clearInterval(this.gameInterval);
    };

    function update() {
    	that.currentBlock.move(Direction.DOWN);
    	that.currentBlock.draw();
    };
}

var game = new Game();
game.run();
