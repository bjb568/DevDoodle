'use strict';

var canvas = document.getElementById("canvas"),
	ctx = canvas.getContext("2d"),
	textarea = document.createElement('textarea');
document.body.appendChild(textarea);
textarea.style.position = 'fixed';
textarea.style.opacity = .001;
function handleTA() {
	if (document.activeElement == textarea || document.activeElement == document.body) {
		textarea.focus();
		if (textarea.value) {
			key = textarea.value;
			textarea.value = '';
		}
	}
};
addEventListener("keydown", function(e) {
	keyCodes[e.keyCode] = true;
	handleTA();
});
addEventListener("keyup", function(e) {
	delete keyCodes[e.keyCode];
	handleTA();
});
addEventListener("keypress", function(e) {
	handleTA();
	
});
//var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") || null; //3D, anyone?
var none = 'transparent', trans = none,
	mouseX = 0,
	mouseY = 0,
	mousePressed = 0,
	key,
	width = 400,
	height = 400,
	scale = canvas.width/canvas.offsetWidth;
addEventListener('resize',function() {
	scale = canvas.width/canvas.offsetWidth;
});
var keyCodes = {};
Object.getOwnPropertyNames(Math).forEach(function(element,index) {
	window[element] = Math[element];
});
Number.prototype.bound = function(l,h) {
	return h!==undefined?Math.max(Math.min(this,h),l):Math.min(this,l);
};
function rand(x,y) {
	if (!x && x != 0) {
		x = 0;
		y = 1;
	} else if (!y && y != 0) {
		y = x;
		x = 0;
	}
	return random()*(y-x)+x;
};
var TAU = 2 * PI;
Object.getOwnPropertyNames(Math).forEach(function(element,index) {
	window[element] = Math[element];
});
function rgb(r,g,b,a) {
	return 'rgba('+round(r)+','+round(g)+','+round(b)+','+(a===undefined?1:a)+')';
};
function hsl(h,s,l,a) {
	return 'hsla('+round(h)+','+round(s)+'%,'+round(l)+'%,'+(a===undefined?1:a)+')';
};
function fill(color,g,b) {
	ctx.fillStyle = trans;
	if (color >= 0) {
		if (b >= 0) {
			ctx.fillStyle = rgb(color,g,b)
		} else {
			ctx.fillStyle = rgb(color,color,color);
		}
	} else {
		ctx.fillStyle = color;
	}
};
function stroke(color,g,b) {
	ctx.strokeStyle = trans;
	if (color >= 0) {
		if (b >= 0) {
			ctx.strokeStyle = rgb(color,g,b)
		} else {
			ctx.strokeStyle = rgb(color,color,color);
		}
	} else {
		ctx.strokeStyle = color;
	}
};
function strokeWidth(w) {
	ctx.lineWidth = w === 0 ? .0001 : w;
};
function line(x1,y1,x2,y2) {
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
};
function rect(x,y,w,h) {
	ctx.fillRect(x,y,w,h);
	ctx.strokeRect(x,y,w,h);
};
function point(x,y) {
	rect(x,y,1,1);
};
function ellipse(cx, cy, rx, ry) {
	if (!cx && cx !== 0) {
		throw 'Invalid or missing argument[0] for ellipse';
	}
	if (!cy && cy !== 0) {
		throw 'Invalid or missing argument[1] for ellipse'
	}
	if (!(rx >= 0)) {
		throw 'Invalid or missing argument[2] for ellipse';
	}
	if (!(ry >= 0)) {
		throw 'Invalid or missing argument[3] for ellipse'
	}
	if (rx < 1.5 && ry < 1.5) {
		strokeWidth((rx+ry) / 2);
		point(cx,cy);
	} else if (rx < 1.5 || ry < 1.5) {
		line(cx-(abs(rx)>2?rx:0),cy-(abs(ry)>2?ry:0),cx+(abs(rx)>2?rx:0),cy+(abs(ry)>2?ry:0));
	} else {
		ctx.save();
		ctx.beginPath();
		ctx.translate(cx-rx, cy-ry);
		ctx.scale(rx, ry);
		ctx.arc(1, 1, 1, 0, TAU, false);
		ctx.restore();
		ctx.fill();
		ctx.stroke();
	}
};
function textAlign(h,v) {
	if (arguments.length !== 2) throw 'textAlign expects 2 arguments';
	ctx.textAlign = h.toLowerCase();
	ctx.textBaseline = v.toLowerCase();
};
function font(f) {
	ctx.font = f;
};
function text(x,y,t) {
	strokeWidth(ctx.lineWidth * 2);
	ctx.strokeText(t,x,y);
	ctx.fillText(t,x,y);
	strokeWidth(ctx.lineWidth / 2);
};
function bg() {
	var oldFill = ctx.fillStyle;
	var oldStroke = ctx.strokeStyle;
	fill.apply(this,arguments);
	ctx.fillRect(0,0,32766,32766);
	fill(oldFill);
	stroke(oldStroke);
};
function size(x,y) {
	canvas.width = width = x;
	canvas.height = height = y;
	bg('#000');
};
function resetLog() {
	var node = document.getElementById('console'), child;
	while (child = node.firstChild) node.removeChild(child);
};
function print(input) {
	var pre = document.createElement('pre');
	pre.innerHTML = input;
	document.getElementById('console').appendChild(pre);
};
function reset(a) {
	fill(255);
	stroke(255,0,0);
	strokeWidth(2);
	if (!a) {
		size(400,400);
		bg(0);
		resetLog();
		frameRate = 30;
		draw = function() {};
	}
};
function error(e) {
	for (var i in e) console.log(i, e[i]);
	document.getElementById('console').insertAdjacentHTML('beforeend', '<pre style="color:#f22">' + ((navigator.userAgent.indexOf('Safari') != -1 && e.line == 1 && e instanceof SyntaxError ? '' : (window.chrome ? e.stack : '<strong>Line ' + (e.line || e.lineNumber) + '</strong> ')) + e) + '</pre>');
};
var frameRate = 30;
var draw = function() {};
(function drawLoop() {
	reset(1);
	try { draw() }
	catch(e) { error(e) }
	key = undefined;
	setTimeout(drawLoop, 1000 / frameRate);
})();
reset();
if (navigator.userAgent.indexOf('Mobile') == -1) {
	addEventListener('mousemove',function(e) {
		var cRect = canvas.getBoundingClientRect();
		mouseX = (e.clientX - Math.round(cRect.left)) / cRect.width * width;
		mouseY = (e.clientY - Math.round(cRect.top)) / cRect.height * height;
		mouseX = mouseX.bound(0,width);
		mouseY = mouseY.bound(0,height);
	});
	document.getElementById('canvas').addEventListener('mousedown', function() {
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
				mouseX = mouseX.bound(0,width);
				mouseY = mouseY.bound(0,height);
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
	var b = document.createElement('a');
	b.textContent = '[Keyboard]';
	b.style.display = 'block';
	b.onclick = handleTA;
	document.body.appendChild(b);
}