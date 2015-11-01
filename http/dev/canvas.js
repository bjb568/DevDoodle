window.alert = window.confirm = window.prompt = null;

var canvas = document.getElementById('canvas'),
	ctx = canvas.getContext('2d'),
	textarea = document.createElement('textarea');
document.body.appendChild(textarea);
textarea.style.position = 'fixed';
textarea.style.top = '0';
textarea.style.zIndex = '-1';
textarea.style.opacity = '0';
function handleTA() {
	if (document.activeElement == textarea || document.activeElement == document.body) {
		textarea.focus();
	}
}
var keyCodes = {};
addEventListener('keydown', function(e) {
	keyCodes[e.keyCode] = true;
	handleTA();
});
addEventListener('keyup', function(e) {
	delete keyCodes[e.keyCode];
	delete keyCodes[229];
	handleTA();
});
addEventListener('keypress', function(e) {
	handleTA();
});
//var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || null; //3D, anyone?
var none = 'transparent', trans = none,
	enabledFullScreen = false,
	suppressKeyboard = false,
	requestEnableFullScreen = new Error('No fullscreen capability'),
	mouseX = 0,
	mouseY = 0,
	mousePressed = 0,
	key = '',
	width = 400,
	height = 400,
	scale = canvas.width / canvas.offsetWidth;
addEventListener('resize', function() {
	if (enabledFullScreen) canvas.style.zoom = 100 / devicePixelRatio + '%';
	scale = canvas.width / canvas.offsetWidth;
	if (enabledFullScreen) {
		size();
		reset(true);
		refresh();
		draw();
	}
});
Object.getOwnPropertyNames(Math).forEach(function(element, index) {
	window[element] = Math[element];
});
Number.prototype.bound = function(l, h) {
	return isNaN(h) ? Math.min(this, l) : Math.max(Math.min(this, h), l);
};
function requestFullLayoutMode() {
	enabledFullScreen = requestEnableFullScreen = true;
	canvas.style.zoom = 100 / devicePixelRatio + '%';
	document.getElementById('console').style.height = 'auto';
	document.getElementById('console').style.maxHeight = '240px';
	size();
	reset(true);
}
function rand(x, y) {
	if (!x && x != 0) {
		x = 0;
		y = 1;
	} else if (!y && y != 0) {
		y = x;
		x = 0;
	}
	return random() * (y - x) + x;
}
var TAU = 2 * PI;
Object.getOwnPropertyNames(Math).forEach(function(element, index) {
	window[element] = Math[element];
});
function rgb(r, g, b, a) {
	return 'rgba(' + round(r) + ',' + round(g) + ',' + round(b) + ',' + (a === undefined ? 1 : a) + ')';
}
function hsl(h, s, l, a) {
	return 'hsla(' + round(h) + ',' + round(s) + '%,' + round(l) + '%,' + (a === undefined ? 1 : a) + ')';
}
function fill(color, g, b) {
	ctx.fillStyle = trans;
	if (color >= 0) {
		if (b >= 0) ctx.fillStyle = rgb(color, g, b);
		else ctx.fillStyle = rgb(color, color, color);
	} else ctx.fillStyle = color;
}
function stroke(color, g, b) {
	ctx.strokeStyle = trans;
	if (color >= 0) {
		if (b >= 0) ctx.strokeStyle = rgb(color, g, b);
		else ctx.strokeStyle = rgb(color, color, color);
	} else ctx.strokeStyle = color;
}
function strokeWidth(w) {
	ctx.lineWidth = Math.max(0.0001, w);
}
function line(x1, y1, x2, y2) {
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}
function curve(x1, y1, x2, y2, x3, y3, x4, y4) {
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	if (x4 !== undefined && y4 !== undefined) ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
	else if (x3 !== undefined && y3 !== undefined) ctx.bezierCurveTo(x2, y2, x2, y2, x3, y3);
	else ctx.lineTo(x2, y2);
	ctx.stroke();
}
function bcurve(x1, y1, x2, y2, x3, y3, x4, y4) {
	curve(
		x2,
		y2,
		x2 * 5/4 - x3/4,
		y2 * 5/4 - y3/4,
		x1,
		y1,
		x1,
		y1
	);
}
function rect(x, y, w, h) {
	ctx.fillRect(x, y, w, h);
	ctx.strokeRect(x, y, w, h);
}
function point(x, y) {
	line(x, y, x + 0.01, y + 0.01);
}
function ellipse(cx, cy, rx, ry) {
	if (!cx && cx !== 0) throw 'Invalid or missing argument[0] for ellipse';
	if (!cy && cy !== 0) throw 'Invalid or missing argument[1] for ellipse';
	if (!(rx >= 0)) throw 'Invalid or missing argument[2] for ellipse';
	if (!(ry >= 0)) throw 'Invalid or missing argument[3] for ellipse';
	ctx.save();
	ctx.beginPath();
	ctx.translate(cx - rx, cy - ry);
	ctx.scale(rx, ry);
	ctx.arc(1, 1, 1, 0, TAU, false);
	ctx.restore();
	ctx.stroke();
	ctx.fill();
}
function textAlign(h, v) {
	if (arguments.length !== 2) throw 'textAlign expects 2 arguments';
	ctx.textAlign = h.toLowerCase();
	ctx.textBaseline = v.toLowerCase();
}
function font(f) {
	ctx.font = f;
}
function text(x, y, t) {
	strokeWidth(ctx.lineWidth * 2);
	ctx.strokeText(t, x, y);
	ctx.fillText(t, x, y);
	strokeWidth(ctx.lineWidth / 2);
}
function bg() {
	var oldFill = ctx.fillStyle;
	var oldStroke = ctx.strokeStyle;
	fill.apply(this, arguments);
	ctx.fillRect(0, 0, width, height);
	fill(oldFill);
	stroke(oldStroke);
}
function size(x, y) {
	if (enabledFullScreen) {
		x = innerWidth * devicePixelRatio;
		y = (innerHeight - document.getElementById('console').offsetHeight - 32) * devicePixelRatio;
	}
	canvas.width = width = x;
	canvas.height = height = y;
}
function resetLog() {
	var node = document.getElementById('console'), child;
	while (child = node.firstChild) node.removeChild(child);
}
function removeLog() {
	resetLog();
	document.getElementById('console').hidden = true;
}
function print() {
	var pre = document.createElement('pre');
	for (var i = 0; i < arguments.length; i++) {
		pre.appendChild(document.createTextNode(' '));
		var span = document.createElement('span');
		span.appendChild(document.createTextNode(arguments[i]));
		pre.appendChild(span);
	}
	document.getElementById('console').appendChild(pre);
	document.getElementById('console').hidden = false;
}
var refresh = function() {};
function reset(a) {
	if (!a) {
		size(400, 400);
		bg(0);
		resetLog();
		frameRate = 30;
		draw = function() {};
		refresh = function() {};
	}
	fill(255);
	stroke(255, 0, 0);
	strokeWidth(2);
}
function error(e) {
	var pre = document.createElement('pre');
	pre.style.color = '#f22';
	if (!(navigator.userAgent.indexOf('Safari') != -1 && e instanceof SyntaxError)) {
		if (window.chrome) pre.appendChild(document.createTextNode(e.stack));
		else {
			var strong = document.createElement('strong');
			strong.appendChild(document.createTextNode('Line ' + (e.line || e.lineNumber) + ' '));
			pre.appendChild(strong);
		}
	}
	pre.appendChild(document.createTextNode(e));
	document.getElementById('console').appendChild(pre);
}
var frameRate = 30;
var draw = function() {};
(function drawLoop() {
	key = textarea.value;
	try {
		draw();
	} catch(e) {
		error(e);
	}
	textarea.value = key = '';
	setTimeout(drawLoop, 1000 / frameRate);
})();
reset();
if (navigator.userAgent.indexOf('Mobile') == -1) {
	addEventListener('mousemove', function(e) {
		var cRect = canvas.getBoundingClientRect();
		mouseX = (e.clientX - Math.round(cRect.left)) / cRect.width * width;
		mouseY = (e.clientY - Math.round(cRect.top)) / cRect.height * height;
		if (enabledFullScreen) {
			mouseX *= devicePixelRatio;
			mouseY *= devicePixelRatio;
		}
		mouseX = mouseX.bound(0, width);
		mouseY = mouseY.bound(0, height);
	});
	canvas.addEventListener('mousedown', function() {
		mousePressed = true;
	});
	addEventListener('mouseup', function() {
		mousePressed = false;
	});
} else {
	var times = 0;
	addEventListener('touchstart', function(e) {
		if (e.touches.length == 1) {
			mousePressed = true;
			try {
				var cRect = canvas.getBoundingClientRect();
				if (e.touches[0].clientX > cRect.left && e.touches[0].clientX < cRect.right && e.touches[0].clientY > cRect.top && e.touches[0].clientY < cRect.bottom) {
					mouseX = (e.touches[0].clientX - Math.round(cRect.left)) / cRect.width * width;
					mouseY = (e.touches[0].clientY - Math.round(cRect.top)) / cRect.height * height;
				}
			} catch(e) {}
			times = 0;
		} else mousePressed = false;
	});
	addEventListener('touchmove', function(e) {
		if (e.touches.length == 1) {
			mousePressed = true;
			try {
				var cRect = canvas.getBoundingClientRect();
				mouseX = (e.touches[0].clientX - Math.round(cRect.left)) / cRect.width * width;
				mouseY = (e.touches[0].clientY - Math.round(cRect.top)) / cRect.height * height;
				if (e.touches[0].clientX > cRect.left && e.touches[0].clientX < cRect.right && e.touches[0].clientY > cRect.top && e.touches[0].clientY < cRect.bottom) {
					times++;
					if (times > 2) {
						e.preventDefault();
					}
					return false;
				}
				mouseX = mouseX.bound(0, width);
				mouseY = mouseY.bound(0, height);
			} catch(e) {}
		} else mousePressed = false;
	});
	addEventListener('touchend', function(e) {
		mousePressed = false;
		try {
			var cRect = canvas.getBoundingClientRect();
			if (e.touches[0].clientX > cRect.left && e.touches[0].clientX < cRect.right && e.touches[0].clientY > cRect.top && e.touches[0].clientY < cRect.bottom) {
				mouseX = (e.touches[0].clientX - Math.round(cRect.left)) / cRect.width * width;
				mouseY = (e.touches[0].clientY - Math.round(cRect.top)) / cRect.height * height;
			}
		} catch(e) {}
	});
	if (!suppressKeyboard) {
		var b = document.createElement('a');
		b.textContent = '[Keyboard]';
		b.style.display = 'block';
		b.onclick = handleTA;
		document.body.appendChild(b);
	}
}