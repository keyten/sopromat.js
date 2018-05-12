const utils = {
	zeroArray : function(len){
		return len ? new Array(len).join(0).split(0).map(n => 0) : [];
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
	}
};

module.exports = utils;