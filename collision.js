Collision = {
	LEFT : 0,
	RIGHT : 1,
	FLOOR : 2,
	BLOCK : 3
}

function CollisionDetector() {
	this.width = 0;
	this.height = 0;

	this.collides = function(block, repo) {
		var bricks = block.getBricks();
		for (var i = 0; i < bricks.length; i++) {
			if (bricks[i][0] < 0)
				return Collision.LEFT;
			else if (bricks[i][0] >= width)
				return Collision.RIGHT;
			else if (bricks[i][1] >= height)
				return Collision.FLOOR;
			else if (bricks[i][1] >= repo.getRow())
		}
	};
}
