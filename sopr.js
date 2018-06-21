const sylv = require('sylvester');
const utils = require('./utils');
const logger = require('./logger');
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
		const vertexMatrixSize = 3;

		logger.info('Считаем элементы');
		// считаем длины, углы, матрицы
		edges.forEach((edge, i) => {
			var start = vertices[edge.start];
			var end = vertices[edge.end];

			edge.len = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
			if(edge.len === 0){
				throw `Element ${i} has length 0!`;
			}

			edge.alpha = Math.atan2(end[1] - start[1], end[0] - start[0]);

			edge.matrix = sopr.stiffnessRotateMatrix({
				l: edge.len,
				E: edge.E,
				G: edge.G,
				Jk: edge.Jk,
				Ju: edge.Ju,
				phi: edge.alpha
			});
			logger.info(`Элемент ${i}: ${edge.start} -> ${edge.end} (длина: ${edge.len}, угол: ${edge.alpha / Math.PI * 180 | 0})`);
		});

		var matrix = utils.blockZeroMatrix(vertexMatrixSize, vertices.length);

		edges.forEach(edge => {
			var [K11, K12, K21, K22] = utils.divideMatrix(edge.matrix);
			matrix[edge.start][edge.start] = matrix[edge.start][edge.start].add(K11);
			matrix[edge.start][edge.end] = matrix[edge.start][edge.end].add(K12);
			matrix[edge.end][edge.start] = matrix[edge.end][edge.start].add(K21);
			matrix[edge.end][edge.end] = matrix[edge.end][edge.end].add(K22);
		});

		matrix = $M(utils.blockToMatrix(matrix));
		logger.info(`Общая матрица: \n${utils.matrixToString(matrix)}`);

		return matrix;
	},

	/*
		fixtures: anchorage, joint
	 */
	solve : (matrix, fixtures, forceValues) => {
		const vertexMatrixSize = 3;
		const count = matrix.elements.length / 3;

		// составляем вектор сил
		let forces = [];
		let forceNames = [];
		let defNames = [];
		for(let i = 0; i < count; i++){
			forces.push(forceValues['Mk' + i]);
			forces.push(forceValues['P' + i]);
			forces.push(forceValues['Mu' + i]);
			forceNames.push(`Mk${i}`);
			forceNames.push(`P${i}`);
			forceNames.push(`Mu${i}`);
			defNames.push(`phi${i}`);
			defNames.push(`v${i}`);
			defNames.push(`theta${i}`);
		}
		forces = $V(forces);
		logger.info(`Вектор сил: \n${utils.vectorsToString([forces, {elements: forceNames}])}`);

		// граничные условия
		let indexes = [];
		fixtures.forEach(fixture => {
			const type = fixture[1],
				index = fixture[0];

			let index1,
				index2,
				index3;

			if(type === 'anchorage'){
				// угол
				index1 = index * vertexMatrixSize + 0;
				// прогиб
				index2 = index * vertexMatrixSize + 1;
				// угол
				index3 = index * vertexMatrixSize + 2;

				logger.info(`Заделка в ${index}: вычёркиваем ${index1}, ${index2} и ${index3}`);

				indexes.push(index1);
				indexes.push(index2);
				indexes.push(index3);
			} else if(type === 'joint'){
				// угол
				index1 = index * vertexMatrixSize + 0;
				// прогиб
				index2 = index * vertexMatrixSize + 1;

				logger.info(`Шарнир в ${index}: вычёркиваем ${index1} и ${index2}`);

				indexes.push(index1);
				indexes.push(index2);
			}
		});

		matrix = utils.removeMatrixCols(matrix, indexes);
		matrix = utils.removeMatrixRows(matrix, indexes);
		forces = utils.removeVectorElem(forces, indexes);
		forceNames = utils.removeArrayElem(forceNames, indexes);
		defNames = utils.removeArrayElem(defNames, indexes);

//		logger.info(`Общая матрица: \n${utils.matrixToString(matrix)}`);
		logger.info(`Вектор сил: \n${utils.vectorsToString([forces, {elements: forceNames}])}`);
//		logger.info(`Вектор сил: \n${forceNames}`);

		const inv = matrix.inv();
		if(!inv){
			throw "Матрица вырождена!";
		}
		let solution = inv.multiply(forces);
		//logger.info(`Решение: ${utils.vectorsToString([solution], defNames)}`)
		var result = {};
		for(let i = 0; i < solution.elements.length; i++){
			result[defNames[i]] = utils.beautifyNumber(solution.elements[i]);
		}

		logger.info(`Прогибы и углы: ${JSON.stringify(result).split(',').join(',\n')}`)

		// Моменты
		return result;
	},

	moments : (edges, solution) => {
		edges.forEach(function(edge, i){
			var alpha = edge.alpha,
				f0 = solution['phi' + edge.start] || 0,
				v0 = solution['v' + edge.start] || 0,
				t0 = solution['theta' + edge.start] || 0,
				f1 = solution['phi' + edge.end] || 0,
				v1 = solution['v' + edge.end] || 0,
				t1 = solution['theta' + edge.end] || 0;

				console.log(alpha);
			edge.vStart = v0;
			edge.vEnd = v1;

			edge.phiStart = f0;
			edge.thetaStart = t0;
			edge.phiEnd = f1;
			edge.thetaEnd = t1;

			var EJ = edge.E * edge.Ju;
			var l = edge.len;
			var a = (v0, l, x) => v0 * ((-6 / Math.pow(l, 2)) + (12 * x / Math.pow(l, 3)))
			var b = (t0, l, x) => t0 * ((-4 / Math.pow(l, 1)) + (6 * x / Math.pow(l, 2)))
			var c = (v1, l, x) => v1 * ((6 / Math.pow(l, 2)) - (12 * x / Math.pow(l, 3)))
			var d = (t1, l, x) => t1 * ((-2 / Math.pow(l, 1)) + (6 * x / Math.pow(l, 2)))

			edge.M = (x) => {
				return a(v0, l, x) + b(t0, l, x) + c(v1, l, x) + d(t1, l, x);
				/* return edge.E * edge.Ju * (
					(2 * (3 * (edge.vEnd - edge.vStart) - edge.len * (edge.thetaEnd - 2 * edge.thetaStart))) / Math.pow(edge.len, 2) -
					(6 * x * (2 * (edge.vEnd - edge.vStart) - edge.len * (edge.thetaEnd - edge.thetaStart))) / Math.pow(edge.len, 3)
				); */
			};

			edge.sigmaStart = Math.abs(edge.M(0) / edge.Wu);
			edge.sigmaEnd = Math.abs(edge.M(l) / edge.Wu);
			logger.info(`Элемент ${i} (${edge.start} -> ${edge.end}): момент (${utils.beautifyNumber(edge.M(0))}, ${utils.beautifyNumber(edge.M(edge.len))}), напряжения (${utils.beautifyNumber(edge.sigmaStart)}, ${utils.beautifyNumber(edge.sigmaEnd)})`)
		});

		var max = -Infinity, j, point;
		edges.forEach((edge, i) => {
			if(edge.sigmaStart > max){
				max = edge.sigmaStart;
				j = i;
				point = 'Start';
			}
			if(edge.sigmaEnd > max){
				max = edge.sigmaEnd;
				j = i;
				point = 'End';
			}
		});

		logger.info(`Максимальные напряжения в узле ${edges[j][point.toLowerCase()]} (элемент ${j} - ${point}): ${utils.beautifyNumber(max)}`);

		return {
			max,
			point: edges[j][point.toLowerCase()],
			edge: j,
			at: point
		};
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