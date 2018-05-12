const sylv = require('sylvester');
const sopr = require('./sopr');
const utils = require('./utils');
var E = 1/2;
const pi = Math.PI;
var points = [
	[0, 0, -10], // 0
	[0, 0, -5], // 1
	[5, 0, -5], // 2
	[5, 0, 0], // 3

	// special points
	[0, 10, -7.5], // 4
	[2.5, 10, -5], // 5
	[5, 10, -2.5] // 6
];
var elements = [
	[0, 1, 4, E],
	[1, 2, 5, E],
	[2, 3, 6, E]
];

var asm = sopr.assemble([
	sopr.stiffnessRotateMatrix({
		l: 5,
		E: 1,
		A: 2,
		J: 0.1,
		phi: 0
	}),
	sopr.stiffnessRotateMatrix({
		l: 3,
		E: 1,
		A: 2,
		J: 0.1,
		phi: pi / 4
	})
]);

var solution = sopr.directSolve(asm, {
	border: 'rigid',

	x1:0, y1:0, m1:0,
	x2:0, y2:1, m2:0,
	x3:0, y3:0, m3:0
});

console.log(solution);
