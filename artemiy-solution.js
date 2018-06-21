const sylv = require('sylvester');
const sopr = require('./sopr');
const utils = require('./utils');
const logger = require('./logger');
const cnst = require('./consts');

const
	l = 10,
	P = 1500, // Ньютон
	E = cnst.V95.E,
	G = cnst.V95.G; // круглое сечение

var edges;
var asm = sopr.construct([
	[0, 0],

	[0, 1.05],
	[0.075, 1.125],
	[0.15, 1.2],

	[0.45, 1.2],
	[0.525, 1.125],
	[0.6, 1.05],

	[0.6, 0]
], edges = [{
	start : 0,
	end : 1
}, {
	start: 1,
	end: 2
}, {
	start: 2,
	end: 3
}, {
	start: 3,
	end: 4
}, {
	start: 4,
	end: 5
}, {
	start: 5,
	end: 6
}, {
	start: 6,
	end: 7
}].map(n => ({
	...n,
	E: cnst.V95.E,
	G: cnst.V95.G,
	Ju: cnst.ring.Jx,
	Jk: cnst.ring.Jk,
	Wu: cnst.ring.Wx,
	Wk: cnst.ring.Wk
})));

/*
var solution = sopr.solve(asm, [
	[0, 'anchorage'],
	[7, 'anchorage']
], {
	...(new Array(30).join(' ').split(' ').reduce((res, val, i) => {
		res['P' + i] = res['Mu' + i] = res['Mk' + i] = 0;
		return res;
	}, {}))
});

console.log(solution);

var moments = sopr.moments(edges, solution, {
	W: 1.74 * Math.pow(10, -6)
});
console.log(edges); */

var zeroforces = new Array(13).join(' ').split(' ').reduce((res, val, i) => {
		res['P' + i] = res['Mu' + i] = res['Mk' + i] = 0;
		return res;
	}, {});
var forcepoints = [2, 5];

var sigmas = forcepoints.map(val => {
	logger.info(`\n===================================== Нагрузка в узле ${val} =====================================`);
	var solution = (sopr.solve(asm, [
		[0, 'anchorage'],
		[7, 'anchorage']
	], {
		...zeroforces,
		['P' + val]: P
	}));

	return sopr.moments(edges, solution);
});

var max = { max: -Infinity };
sigmas.forEach((sigma, j) => {
	if(sigma.max > max.max){
		max = sigma;
		max.forceAt = forcepoints[j];
	}
});
logger.info(max);

logger.info(`Допустимые: ${cnst.V95.maxSigma} (${cnst.V95.maxSigma > max.max})`);
