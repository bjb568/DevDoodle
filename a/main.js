'use strict';

String.prototype.replaceAll = function(find, replace) {
	if (typeof find == 'string') return this.split(find).join(replace);
	var t = this, i, j;
	while (typeof(i = find.shift()) == 'string' && typeof(j = replace.shift()) == 'string') t = t.replaceAll(i || '', j || '');
	return t;
};
String.prototype.repeat = function(num) {
	return new Array(++num).join(this);
};
Number.prototype.bound = function(l, h) {
	return isNaN(h) ? Math.min(this, l) : Math.max(Math.min(this,h),l);
};

var noPageOverflow = false,
	footerOff = false,
	mainContentEl,
	mainBottomPad = 0;

function minHeight() {
	if (noPageOverflow) {
		mainContentEl.style.minHeight = '';
		mainContentEl.style.height = Math.max(innerHeight - (footerOff ? -24 : document.getElementById('footer').offsetHeight) - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12), noPageOverflow) - mainBottomPad + 'px';
	} else {
		mainContentEl.style.height = '';
		mainContentEl.style.minHeight = innerHeight - document.getElementById('footer').offsetHeight - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12) - mainBottomPad + 'px';
	}
};

function request(uri, success, params) {
	var i = new XMLHttpRequest();
	i.open('POST', uri, true);
	i.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	i.send(params);
	i.onload = function() {
		success(this.responseText);
	};
	return i;
};

function ago(od) {
	var d = Math.round((new Date() - od) / 1000);
	if (d < 3600) return Math.round(d / 60) + 'm ago';
	else if (d < 86400) return Math.round(d / 3600) + 'h ago';
	else if (d < 2592000) return Math.round(d / 86400) + 'd ago';
	else {
		d = new Date(od);
		return 'on ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec' ][d.getUTCMonth()] + ' ' + d.getUTCDate() + ' \'' + d.getUTCFullYear().toString().substr(2);
	}
};
function agot(d) {
	var time = document.createElement('time');
	time.textContent = ago(d);
	time.setAttribute('datetime', new Date(d).toISOString());
	return time;
};

addEventListener('DOMContentLoaded', function() {
	mainContentEl = mainContentEl || document.getElementById('content');
	if (navigator.userAgent.indexOf('Trident') != -1 || navigator.userAgent.indexOf('MSIE') != -1) {
		var div = document.createElement('div');
		div.innerHTML = '<!--[if lt IE 9]><i></i><![endif]-->';
		if (div.getElementsByTagName('i').length != 1) {
			var span = document.createElement('span');
			span.appendChild(document.createTextNode('This site does not support Microsoft Internet Explorer due to its lack of compatibility with web specifications.'));
			document.getElementById('err').appendChild(span);
		}
		document.getElementById('cont').hidden = true;
		document.getElementById('cont').style.display = 'none';
	}
	minHeight();
	var e = document.getElementsByTagName('textarea'),
		i = e.length;
	while (i--) {
		e[i].addEventListener('keydown', function(e) {
			if (e.keyCode === 9) {
				if (this.selectionStart == this.selectionEnd) {
					if (e.shiftKey) {
						var cS = this.selectionEnd - 1;
						while (this.value[cS] && this.value[cS] != '\n') {
							if (this.value[cS] == '\t') {
								this.value = this.value.substr(0, cS) + this.value.substr(++cS);
								break;
							} else cS--;
						}
					} else {
						var oS = this.selectionEnd;
						this.value = this.value.substr(0, oS) + '\t' + this.value.substr(oS);
						this.selectionStart = this.selectionEnd = ++oS;
					}
				} else {
					var lines = this.value.split('\n'),
						i = 0,
						start = 0;
					while ((i += lines[start].length) < this.selectionStart - start) start++;
					var end = start;
					i -= lines[start].length;
					while ((i += lines[end].length) < this.selectionEnd - end) end++;
					i = --start;
					while (++i <= end) {
						if (e.shiftKey) lines[i][0] != '\t' || (lines[i] = lines[i].substr(1));
						else lines[i] = '\t' + lines[i];
					}
					this.value = lines.join('\n');
					var nS = lines.slice(0, ++start).join('\n').length;
					this.selectionStart = (nS += nS ? 1 : 0);
					this.selectionEnd = nS + lines.slice(start, ++end).join('\n').length;
				}
				e.preventDefault();
			}
		});
	}
	setInterval(function() {
		var times = document.getElementsByTagName('time');
		for (var i = 0; i < times.length; i++) {
			var t = ago(Date.parse(times[i].getAttribute('datetime')));
			if (times[i].textContent != t) times[i].textContent = t;
		}
	}, 100);
});
addEventListener('load', minHeight);
addEventListener('resize', minHeight);
if (navigator.userAgent.indexOf('Mobile') != -1) addEventListener('touchend', function() {}); //Fixes mobile-safari bug with touch listeners in iframes not firing