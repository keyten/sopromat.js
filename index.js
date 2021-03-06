const sylv = require('sylvester');
const sopr = require('./sopr');
const utils = require('./utils');
const logger = require('./logger');
const cnst = require('./consts');

const
	l = 1,
	P = 1, // Ньютон
	E = 1,//cnst.V95.E,
	G = 1;//cnst.V95.G; // круглое сечение

var edges;
var asm = sopr.construct([
	[0, 0],
	[1, 0],
	[2, 0],
	[2, 1]
], edges = [{
	start : 0,
	end : 1
}, {
	start: 1,
	end: 2
}, {
	start: 2,
	end: 3
}].map(n => ({
	...n,
	E: 1,//cnst.V95.E,
	G: 1,//cnst.V95.G,
	Ju: 1,//cnst.ring.Jx,
	Jk: 1,//cnst.ring.Jk,
	Wu: 1,//cnst.ring.Wx,
	Wk: 1,//cnst.ring.Wk
})));

var zeroforces = new Array(13).join(' ').split(' ').reduce((res, val, i) => {
		res['P' + i] = res['Mu' + i] = res['Mk' + i] = 0;
		return res;
	}, {});
var forcepoints = [1];

var sigmas = forcepoints.map(val => {
	logger.info(`\n===================================== Нагрузка в узле ${val} =====================================`);
	var solution = (sopr.solve(asm, [
		[0, 'anchorage'],
		[3, 'anchorage']
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
