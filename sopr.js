const sylv = require('sylvester');
const utils = require('./utils');
const sopr = {
	stiffnessMatrix: ({l, E, G, Jk, Ju}) => {
		var l2 = l * l,
			l3 = l * l * l,
			GJk = G * Jk,
			EJu = E * Ju;
		return $M([[
			GJk * l2, 0, 0, -GJk * l2, 0, 0
		], [
			0, 12 * EJu, 6 * EJu * l, 0, -12 * EJu, 6 * EJu * l
		], [
			0, 6 * EJu * l, 4 * EJu * l2, 0, -6 * EJu * l, 2 * EJu * l2
		], [
			-GJk * l2, 0, 0, GJk * l2, 0, 0
		], [
			0, -12 * EJu, -6 * EJu * l, 0, 12 * EJu, -6 * EJu * l
		], [
			0, 6 * EJu * l, 2 * EJu * l2, 0, -6 * EJu * l, 4 * EJu * l2
		]]).multiply(1 / l3)
	},

	angleMatrix: (phi) => $M([
		[
			Math.cos(phi),
			0,
			-Math.sin(phi),
			0,
			0,
			0
		], [
			0,
			1,
			0,
			0,
			0,
			0
		], [
			Math.sin(phi),
			0,
			Math.cos(phi),
			0,
			0,
			0
		], [
			0,
			0,
			0,
			Math.cos(phi),
			0,
			-Math.sin(phi)
		], [
			0,
			0,
			0,
			0,
			1,
			0
		], [
			0,
			0,
			0,
			Math.sin(phi),
			0,
			Math.cos(phi)
		]
	]),

	stiffnessRotateMatrix : ({l, E, G, Jk, Ju, phi}) => {
		return utils.multiplyChain([
			sopr.angleMatrix(phi),
			sopr.stiffnessMatrix({l, E, G, Jk, Ju}),
			sopr.angleMatrix(phi).inv()
		]);
	},

	// Граничные условия соединения стержней — равенство v(x), v'(x) на границах!
	assemble : (matrices) => {
		var dimension = getAssembleDimensionByCount(matrices.length);

		return matrices.map((matrix, index) => {
			return utils.padMatrix(matrix, {
				left: index * 3,
				top: index * 3,
				right: dimension - 6 - (index * 3), // 6 is the stiffness matrix size
				bottom: dimension - 6 - (index * 3)
			});
		}).reduce((sum, matrix) => {
			return sum.add(matrix);
		});

		function getAssembleDimensionByCount(count){
			return 3 * (count + 1);
		}
	},

	construct : (vertices, edges) => {
		// считаем длины, углы, матрицы
		edges.forEach((edge, i) => {
			var start = vertices[edge.start];
			var end = vertices[edge.end];

			edge.len = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
			if(edge.len === 0){
				throw `Element ${i} has length 0!`;
			}

			edge.alpha = Math.atan2(end[1] - start[1], end[0] - start[0]);// / Math.PI * 180;

			edge.matrix = sopr.stiffnessRotateMatrix({
				l: edge.len,
				E: edge.E,
				G: edge.G,
				Jk: edge.Jk,
				Ju: edge.Ju,
				phi: edge.alpha
			});
		});

		var vertexMatrixSize = 3,
			matrix = utils.blockZeroMatrix(vertexMatrixSize, vertices.length);

		edges.forEach(edge => {
			var [K11, K12, K21, K22] = utils.divideMatrix(edge.matrix);
			matrix[edge.start][edge.start] = matrix[edge.start][edge.start].add(K11);
			matrix[edge.start][edge.end] = matrix[edge.start][edge.end].add(K12);
			matrix[edge.end][edge.start] = matrix[edge.end][edge.start].add(K21);
			matrix[edge.end][edge.end] = matrix[edge.end][edge.end].add(K22);
		});

		return $M(utils.blockToMatrix(matrix));
	},

	borders : (assemble, border) => {
		if(border === 'rigid'){
			return utils.unpadMatrix(assemble, {
				left: 3,
				right: 3,
				top: 3,
				bottom: 3
			});
		}
	},

	reverseSolve : (assemble, values) => {
		var count = assemble.elements.length / 3 - 1;

		var deformations = [];
		for(var i = -1; i < count; i++){
			deformations.push(values['x' + (i + 2)]);
			deformations.push(values['y' + (i + 2)]);
			deformations.push(values['theta' + (i + 2)]);
		}
		deformations = $V(deformations);

		if(values.border === 'rigid'){
			assemble = utils.unpadMatrix(assemble, {
				left: 3,
				right: 3,
				top: 3,
				bottom: 3
			});

			deformations = utils.unpadVector(deformations, {
				top: 3,
				bottom: 3
			});
		}

		var solution = assemble.multiply(deformations);
		var result = {};
		for(let i = 0; i < solution.elements.length; i++){
			let index = i / 3 | 0 + 2;
			let forceIndex = i % 3;
			let forceName = ['x', 'y', 'm'][forceIndex];
			result[forceName + index] = utils.beautifyNumber(solution.elements[i]);
		}
		return result;
	},

	directSolve: (assemble, values) => {
		var count = assemble.elements.length / 3 - 1;

		var forces = [];
		for(var i = -1; i < count; i++){
			forces.push(values['x' + (i + 2)]);
			forces.push(values['y' + (i + 2)]);
			forces.push(values['m' + (i + 2)]);
		}
		forces = $V(forces);

		if(values.border === 'rigid'){
			assemble = utils.unpadMatrix(assemble, {
				left: 3,
				right: 3,
				top: 3,
				bottom: 3
			});

			forces = utils.unpadVector(forces, {
				top: 3,
				bottom: 3
			});
		}

		var solution = assemble.inv().multiply(forces);
		var result = {};
		for(let i = 0; i < solution.elements.length; i++){
			let index = i / 3 | 0 + 2;
			let deformationIndex = i % 3;
			let deformationName = ['x', 'y', 'theta'][deformationIndex];
			result[deformationName + index] = utils.beautifyNumber(solution.elements[i]);
		}
		return result;
	}
};

module.exports = sopr;