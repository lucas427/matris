/* dependencies:
 * Matrix.js
 * helpers.js (in createNewPlayerBlock)
 * block-logic.js (in createNewPlayerBlock and updateScore)
 */

const directionToXOffset = {
	ArrowLeft: -1,
	ArrowRight: 1,
	ArrowDown: 0,
};

class Game {
	constructor(height, width) {
		this.matrix = new Matrix(height, width);
		this.playerBlock = { x: null, y: null };
		/* playerBlock: points the block currently guided by the player in the matrix */
		this.score = 0;
	}

	isPlayerBlockSettled() {
		if (this.playerBlock.y == 0) return true;
		const blockBelow = {
			y: this.playerBlock.y - 1,
			x: this.playerBlock.x,
		};
		return !this.matrix.isAvailable(blockBelow);
	}

	isGameOver() {
		const y = this.matrix.height - 1;
		for (let x = 0; x < this.matrix.width; x++) {
			const settled =
				!this.matrix.isAvailable({ x, y }) &&
				!this.matrix.isAvailable({ x, y: y - 1 });
			if (settled) return true;
		}
		return false;
	}

	/* createNewPlayerBlock: instantiates a new block on the top
	 * of the matrix, which this.playerBlock will point to */
	createNewPlayerBlock() {
		this.playerBlock = {
			y: this.matrix.height - 1,
			x: randomIntBetween(0, this.matrix.width),
		};
		this.matrix.setBlock(this.playerBlock, randomBlock());
	}

	/* updatePlayerBlock: moves the playerBlock according
	 * to the given direction */
	updatePlayerBlock(direction) {
		/* horizontally, the player can go left, right or stay,
		 * then the block will also go down */

		const xMovement = directionToXOffset[direction];
		let updated, original, down, horizontal, horizontalDown;

		original = {
			y: this.playerBlock.y,
			x: this.playerBlock.x,
		};
		down = {
			y: original.y - 1,
			x: original.x,
		};
		horizontal = {
			y: original.y,
			x: original.x + xMovement,
		};
		horizontalDown = {
			y: horizontal.y - 1,
			x: horizontal.x,
		};

		/* first tries to move horizontally and down.
		 * if it can't, then tries to move just horizontally.
		 * if it can't, then tries to move just down.
		 * if it can't, then doesn't move at all */
		if (this.matrix.isAvailable(horizontalDown)) updated = horizontalDown;
		else if (this.matrix.isAvailable(horizontal)) updated = horizontal;
		else if (this.matrix.isAvailable(down)) updated = down;
		else updated = original;

		/* moves the block in the matrix and updates this.playerBlock to point to it */
		this.playerBlock = this.matrix.moveBlock(this.playerBlock, updated);
	}


	start() {
		this.createNewPlayerBlock();
	}


	update(input) {
		if (this.isGameOver()) return;

		this.updatePlayerBlock(input);
		if (!this.isGameOver() && this.isPlayerBlockSettled()) {
			this.updateScore();
			this.createNewPlayerBlock();
		}
	}


	/* makeBlocksFall: applies gravity to the matrix,
	 * blocks with empty spaces below will go down until reaching ground */
	makeBlocksFall() {
		let current = {y:null, x:null};

		for (current.y = 0; current.y < this.matrix.height-1; current.y++) {
			for (current.x = 0; current.x < this.matrix.width; current.x++) {
				if (this.matrix.getBlock(current) == ' ') {
					const above = {
						y: current.y + 1,
						x: current.x,
					};
					this.matrix.moveBlock(above, current);
					// move from above to the current position (below)
				}
			}
		}
	}


	updateScore() {
		let left, center, right;
		let leftOperand, operator, rightOperand;

		let hExprCount = 0; //# of horizontal expressions found
		let vExprCount = 0; //# of vertical expressions found

		let oldMatrix = this.matrix.copy();
		/* This procedure reads the expression from a copy (oldMatrix)
		 * and modifies this.matrix accordingly (erasing true expressions to free space).
		 * To understand why this is done, consider the following situation:
		 * 7 > 3
		 * x x <
		 * x x 9
		 * Note that the 3 is part of two expression (7>3 and 3<9), and we want to consider both.
		 * To do so, the procedure reads 7>3 from oldMatrix and erases it in this.matrix.
		 * Since the expression isn't erased in oldMatrix, the 3 is still going to be there
		 * when 3<9 is read.*/

		// Find and count true expressions in rows (horizontal)
		for (let row = 0; row < oldMatrix.height; row++) {
			for (let col = 1; col < oldMatrix.width-1; col++) {
				left   = {y:row, x:col-1};
				center = {y:row, x:col};
				right  = {y:row, x:col+1};

				leftOperand  = oldMatrix.getBlock(left);
				operator     = oldMatrix.getBlock(center);
				rightOperand = oldMatrix.getBlock(right);

				if (isTrueExpression(leftOperand, operator, rightOperand)) {
					this.matrix.setBlock(left, ' ');
					this.matrix.setBlock(center, ' ');
					this.matrix.setBlock(right, ' ');
					hExprCount++;
				}
			}
		}

		// Find and count true expressions in cols (vertical)
		for (let row = 1; row < oldMatrix.height-1; row++) {
			for (let col = 0; col < oldMatrix.width; col++) {
				left   = {y:row+1, x:col};
				center = {y:row,   x:col};
				right  = {y:row-1, x:col};

				leftOperand  = oldMatrix.getBlock(left);
				operator     = oldMatrix.getBlock(center);
				rightOperand = oldMatrix.getBlock(right);

				if (isTrueExpression(leftOperand, operator, rightOperand)) {
					this.matrix.setBlock(left, ' ');
					this.matrix.setBlock(center, ' ');
					this.matrix.setBlock(right, ' ');
					vExprCount++;
				}
			}
		}

		// Calculates score
		const hExprValue = 1;
		const vExprValue = 2;
		this.score += hExprValue*hExprCount + vExprValue*vExprCount;

		if (hExprCount > 0 || vExprCount > 0) {
			this.makeBlocksFall();
			/* makeBlocksFall because expressions may be formed below other blocks, and we don't want
			 * the blocks to just float there after the expression is erased */

			/*
			this.updateScore();
			// updateScore is called again because a falling block may form some new expression
			commented out because i'm not sure if this situation is even possible
			*/
		}
	}

	/* HTMLrendering: returns a rendering of the matrix as an HTML table.
	 * styling is defered, as only the css classes are provided */
	HTMLrendering(gameOverModal) {
		let html = "";
		let block;
		let danger; //to make the top row red, indicating game over
		html += '<table id="game-table">';
		for (let y = this.matrix.height - 1; y >= 0; y--) {
			danger = y == this.matrix.height - 1 ? "danger" : "";
			html += '<tr class="game-row">';
			for (let x = 0; x < this.matrix.width; x++) {
				block = this.matrix.getBlock({ y, x });
				html += `<td class="game-cell ${danger} ${getType(block)}">`;
				html += block;
				html += "</td>";
			}
			html += "</tr>";
		}
		html += "</table>";
		if (this.isGameOver()) {
			gameOverModal.style = "display: flex;";
		}
		return html;
	}
}
