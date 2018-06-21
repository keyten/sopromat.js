const sylv = require('sylvester');
const sopr = require('./sopr');
const utils = require('./utils');
const logger = require('./logger');

var gigapascal = Math.pow(10, 9);
/*
var l = 1, // meters

	// Aluminium
	E = 70 * gigapascal, // pascal
	G = 26 * gigapascal,
	// Circle
	Ju = 4 * Math.PI, // meters^4
	Jk = Math.PI * Math.pow(4, 3) / 16

	k = 3 * E * Ju / Math.pow(l, 3),

	P = 1; */


const
	w = 3,
	h = 1.5,
	l = 10,
	P = 1500, // Ньютон
	E = 64 /* 74? */ * Math.pow(10, 9),
	G = 27 * Math.pow(10, 9),
	Ju = Math.PI * Math.pow(0.075, 4) / 4, // круглое сечение
	Jk = Math.PI * Math.pow(0.075, 4) / 2, // круглое сечение
	Wu = Ju / 0.075, // круглое сечение

	JuT = Ju,
	JkT = Jk,
	JuU = Ju,
	JkU = Jk;

var edges;
var asm = sopr.construct([
	[0, 0],						// 0
	[0, h],						// 1
	[w / 3, 0],					// 2
	[w / 3, h / 3],				// 3
	[w / 3, h],					// 4
	[w / 2, h],					// 5
	[2 * w / 3, 0],				// 6
	[2 * w / 3, h / 3],			// 7
	[2 * w / 3, 2 * h / 3],		// 8
	[2 * w / 3, h],				// 9
	[w, 0],						// 10
	[w, h / 2],					// 11
	[w, h]						// 12
], edges = [{					// 1
	start : 0,
	end : 1,
	Ju: JuU,
	Jk: JkU
}, {							// 2
	start: 0,
	end: 2,
	Ju: JuU,
	Jk: JkU
}, {							// 3
	start: 1,
	end: 4,
	Ju: JuU,
	Jk: JkU
}, {							// 4
	start: 2,
	end: 3,
	Ju: JuU,
	Jk: JkU
}, {							// 5
	start: 3,
	end: 4,
	Ju: JuT,
	Jk: JkT
}, {							// 6
	start: 3,
	end: 7,
	Ju: JuU,
	Jk: JkU
}, {							// 7
	start: 4,
	end: 5,
	Ju: JuU,
	Jk: JkU
}, {							// 8
	start: 5,
	end: 9,
	Ju: JuU,
	Jk: JkU
}, {							// 9
	start: 6,
	end: 7,
	Ju: JuU,
	Jk: JkU
}, {							// 10
	start: 7,
	end: 8,
	Ju: JuT,
	Jk: JkT
}, {							// 11
	start: 8,
	end: 9,
	Ju: JuT,
	Jk: JkT
}, {							// 12
	start: 6,
	end: 10,
	Ju: JuU,
	Jk: JkU
}, {							// 13
	start: 9,
	end: 12,
	Ju: JuU,
	Jk: JkU
}, {							// 14
	start: 10,
	end: 11,
	Ju: JuU,
	Jk: JkU
}, {							// 15
	start: 11,
	end: 12,
	Ju: JuU,
	Jk: JkU
}].map(n => ({
	...n,
	E, G, Wu//, Ju, Jk
})));

var zeroforces = new Array(13).join(' ').split(' ').reduce((res, val, i) => {
		res['P' + i] = res['Mu' + i] = res['Mk' + i] = 0;
		return res;
	}, {});
var forcepoints = [4, 7, 8, 11];

var sigmas = forcepoints.map(val => {
	logger.info(`\n===================================== Нагрузка в узле ${val} =====================================`);
	var solution = (sopr.solve(asm, [
		[0, 'joint'],
		[1, 'joint'],
		[10, 'joint'],
		[12, 'joint']
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
//console.log(edges);
