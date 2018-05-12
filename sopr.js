const sylv = require('sylvester');
const utils = require('./utils');
const sopr = {
	stiffnessMatrix: ({l, E, A, J}) => {
		var l2 = l * l,
			l3 = l * l * l,
			Al2 = A * l2,
			Jl = J * l,
			Jl2 = J * l2;
		return $M([
			[
				Al2, 0, 0, -Al2, 0, 0
			],
			[
				0, 12 * J, 6 * Jl, 0, -12 * J, 6 * Jl
			],
			[
				0, 6 * Jl, 4 * Jl2, 0, -6 * Jl, 2 * Jl2
			], [
				-Al2, 0, 0, Al2, 0, 0
			], [
				0, -12 * J, -6 * Jl, 0, 12 * J, -6 * Jl
			], [
				0, 6 * Jl, 2 * Jl2, 0, -6 * Jl, 4 * Jl2
			]
		]).multiply(E / l3)
	},

	angleMatrix: (phi) => $M([
		[
			Math.cos(phi),
			Math.sin(phi),
			0,
			0,
			0,
			0
		], [
			-Math.sin(phi),
			Math.cos(phi),
			0,
			0,
			0,
			0
		], [
			0,
			0,
			1,
			0,
			0,
			0
		], [
			0,
			0,
			0,
			Math.cos(phi),
			Math.sin(phi),
			0
		], [
			0,
			0,
			0,
			-Math.sin(phi),
			Math.cos(phi),
			0
		], [
			0,
			0,
			0,
			0,
			0,
			1
		]
	]),

	stiffnessRotateMatrix : ({l, E, A, J, phi}) => {
		return utils.multiplyChain([
			sopr.angleMatrix(phi),
			sopr.stiffnessMatrix({l, E, A, J}),
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