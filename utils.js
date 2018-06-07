const utils = {
	zeroArray : function(len){
		return len ? new Array(len).join(0).split(0).map(n => 0) : [];
	},

	blockZeroMatrix : function(blockSize, matrixSize){
		var els = [];
		for(let i = 0; i < matrixSize; i++){
			els[i] = [];
			for(let j = 0; j < matrixSize; j++){
				els[i].push(utils.zeroMatrix(blockSize));
			}
		}
		return els;
	},

	zeroMatrix : function(size){
		var row = [];
		for(let i = 0; i < size; i++){
			row.push(0);
		}

		var els = [];
		while(size--){
			els.push(row.slice());
		}

		return $M(els);
	},

	blockToMatrix : function(blocks){
		var els = [];
		var blockSize = blocks[0][0].elements.length;
		// заполняем els нулями
		for(var i = 0; i < blockSize * blocks.length; i++){
			els[i] = [];
			for(var j = 0; j < blockSize * blocks.length; j++){
				els[i][j] = 0;
			}
		}

		blocks.forEach((row, y) => {
			row.forEach((block, x) => {
				var corner = [
					x * blockSize,
					y * blockSize
				];
				block = block.elements;
				block.forEach((blockRow, yInBlock) => {
					blockRow.forEach((num, xInBlock) => {
						els[corner[1] + yInBlock][corner[0] + xInBlock] = num;
					});
				});
				//console.log();
				//console.log(x, y, block);
			});
		});
		//console.log(blockSize);
		return $M(els);
	},

	divideMatrix : function(matrix){
		var e = matrix.elements,
			K11 = $M([
				[e[0][0], e[0][1], e[0][2]],
				[e[1][0], e[1][1], e[1][2]],
				[e[2][0], e[2][1], e[2][2]],
			]),
			K12 = $M([
				[e[0][3], e[0][4], e[0][5]],
				[e[1][3], e[1][4], e[1][5]],
				[e[2][3], e[2][4], e[2][5]],
			]),
			K21 = $M([
				[e[3][0], e[3][1], e[3][2]],
				[e[4][0], e[4][1], e[4][2]],
				[e[5][0], e[5][1], e[5][2]],
			]),
			K22 = $M([
				[e[3][3], e[3][4], e[3][5]],
				[e[4][3], e[4][4], e[4][5]],
				[e[5][3], e[5][4], e[5][5]],
			]);
		return [K11, K12, K21, K22];
	},

	padMatrix : function(matrix, offset){
		var elements = matrix.elements;
		var dimension = elements[0].length + offset.left + offset.right;

		for(let j = 0; j < elements.length; j++){
			elements[j] = utils.zeroArray(offset.left)
				.concat(elements[j])
				.concat(utils.zeroArray(offset.right));
		}

		for(let i = 0; i < offset.top; i++){
			elements.unshift(utils.zeroArray(dimension));
		}

		for(let i = 0; i < offset.bottom; i++){
			elements.push(utils.zeroArray(dimension));
		}

		return $M(elements);
	},

	unpadMatrix : function(matrix, offset){
		var elements = matrix.elements;

		for(let i = 0; i < offset.top; i++){
			elements.shift();
		}

		for(let i = 0; i < offset.bottom; i++){
			elements.pop();
		}

		for(let i = 0; i < elements.length; i++){
			for(let j = 0; j < offset.left; j++){
				elements[i].shift();
			}
			for(let j = 0; j < offset.right; j++){
				elements[i].pop();
			}
		}

		return $M(elements);
	},

	unpadVector : function(vector, offset){
		var elements = vector.elements;

		for(let i = 0; i < offset.top; i++){
			elements.shift();
		}

		for(let i = 0; i < offset.bottom; i++){
			elements.pop();
		}

		return $V(elements);
	},

	multiplyChain : (matrices) => {
		var matrix = matrices[0];
		for(let i = 1; i < matrices.length; i++){
			matrix = matrix.multiply(matrices[i]);
		}
		return matrix;
	},

	beautifyNumber : (num) => {
		return +num.toFixed(5);
	},

	beautifyMatrix : (matrix) => {
		var elements = matrix.elements;
		for(var i = 0; i < elements.length; i++){
			for(var j = 0; j < elements[i].length; j++){
				elements[i][j] = utils.beautifyNumber(elements[i][j]);
			}
		}
		return $M(elements);
	}
};

module.exports = utils;