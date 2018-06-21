var V95 = {
	E: 74 * Math.pow(10, 9),
	G: 27 * Math.pow(10, 9),

	maxSigma: 490 * Math.pow(10, 6) // 490-510
};

var ring = (() => {
	var d = 0.04,
		d1 = 0.035,

		c = d1 / d,
		Jx = (Math.PI * Math.pow(d, 4) * (1 - Math.pow(c, 4))) / 64,
		Wx = (Math.PI * Math.pow(d, 3) * (1 - Math.pow(c, 4))) / 32,
		Jy = Jx,
		Wy = Wx,

		Jk = (Math.PI * Math.pow(d, 4) * (1 - Math.pow(c, 4))) / 32,
		Wk = (Math.PI * Math.pow(d, 3) * (1 - Math.pow(c, 4))) / 16;
	return {
		Jx,
		Jy,
		Wx,
		Wy,

		Jk,
		Wk
	};
})();

var tavr = (() => {
	var b1 = 0.003,
		b = 0.083,
		h1 = 0.003,
		h = 0.04,
		delta = 0.04,
		s = 0.003,

		v = (b * Math.pow(h1, 2) + (b1) * h * (2 * h1 + h)) / (2 * (b * h1 + b1 * h))
		Jy = (h * Math.pow(b1, 3) + h1 * Math.pow(b, 3)) / 12
		Jx = (b * Math.pow(h1, 3) + b1 * Math.pow(h, 3)) / 12 + b * h1 * Math.pow(v - (h1 / 2), 2) + h * b1 * Math.pow(h/2 + h1 - v, 2)

		Wx_bottom = Jx / v
		Wx_top = Jx / (h + h1 - v)
		Wy_top = (h * Math.pow(b1, 3) + h1 * Math.pow(b, 3)) / (6 * b),

		eta = 1.15,
		Jk = (eta * Math.pow(delta, 3) / 3) * (3 * s + delta),
		Wk = (eta * Math.pow(delta, 2) / 3) * (3 * s + delta);

	return {
		Jx,
		Jy,
		Wx_bottom,
		Wx_top,
		Wy_top,

		Jk,
		Wk
	};
})();

var corner = (() => {
	var s = 0.003,
		b = 0.04,

		// см = 0.01 м
		// см^2 = 0.0001
		// 0.000001

		Jx = 3.55e-8, /* см^4 */
		Jy = Jx,
		Wx = 0.0000012200000000000002, /* см^3 */
		Wy = Wx,
		Jk = (Math.pow(b, 3) / 3) * (2 * s + b),
		Wk = (Math.pow(b, 2) / 3) * (2 * s + b);

	return {
		Jx,
		Jy,
		Wx,
		Wy,

		Jk,
		Wk
	};
})();

module.exports = {
	V95, ring, tavr, corner
};