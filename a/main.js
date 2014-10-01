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

function html(input) {
	return input.toString().replaceAll(['&', '<', '"'], ['&amp;', '&lt;', '&quot;']);
};
function markdown(src) {
	var h = '';
	function inlineEscape(s) {
		return s.split('`').map(function(val, i, arr) {
			if (i % 2) return '<code>' + html(val) + '</code>';
			else {
				return html(val)
					.replace(/!\[([^\]]+)]\(([^\s("&]+\.[^\s("&]+)\)/g, '<img alt="$1" src="$2" />')
					.replace(/\[([^\]]+)]\(([^\s("&]+\.[^\s("&]+)\)/g, '$1'.link('$2'))
					.replace(/([^;["])(https?:\/\/([^\s("&]+\.[^\s("&]+))/g, '$1' + '$3'.link('$2'))
					.replace(/^(https?:\/\/([^\s("&]+\.[^\s("&]+))/g, '$2'.link('$1'))
					.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
					.replace(/\*([^*]+)\*/g, '<em>$1</em>') + (i == arr.length - 1 && i != 0 ? '</code>' : '');
			}
		}).join('');
	}
	if (!src.match(/\n+/) && src.substr(0, 2) != '> ') return inlineEscape(src);
	src.replace(/\r|\s+$/g, '').replace(/\t/g, '	').split(/\n\n+/).forEach(function(b, f, R) {
		var f = b.substr(0, 2),
			R = {
				'* ': [(/\n\* /), '<ul><li>', '</li></ul>'],
				'- ': [(/\n- /), '<ul><li>', '</li></ul>'],
				'	': [(/\n		/),'<pre><code>', '</code></pre>', '\n'],
				'> ': [(/\n> /),'<blockquote>', '</blockquote>', '\n']
			}[f];
		if (!R && b.match(/\n[1-9]\d*\. /)) R = [(/\n[1-9]\d*\. /), '<ol><li>', '</li></ol>'];
		else if (!R && b.match(/\n[1-9]\d*\) /)) R = [(/\n[1-9]\d*\) /), '<ol><li>', '</li></ol>'];
		f = b[0];
		if (R) h += R[1] + ('\n' + b).split(R[0]).slice(1).map(R[3] ? html : inlineEscape).join(R[3] || '</li>\n<li>') + R[2];
		else if (f == '#') h += '<h' + Math.min(6, f = b.indexOf(' ')) + '>' + inlineEscape(b.slice(f + 1)) + '</h' + Math.min(6, f) + '>';
		else h += '<p>' + inlineEscape(b) + '</p>';
	});
	return h;
};

var noPageOverflow = false,
	pageOverflowMobile = false,
	footerOff = false,
	mainContentEl,
	mainBottomPad = 0;

function minHeight() {
	var footer = document.getElementById('footer').offsetHeight,
		sidebar = document.getElementById('sidebar');
	if (innerWidth <= 1500 && sidebar) footer += sidebar.offsetHeight + 6;
	if (noPageOverflow && !(pageOverflowMobile && innerWidth <= 800)) {
		mainContentEl.style.minHeight = '';
		mainContentEl.style.height = Math.max(innerHeight - (footerOff ? -24 : footer) - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - (innerWidth <= 1500 ? 6 : 12), noPageOverflow) - mainBottomPad + 'px';
		if (sidebar) sidebar.style.height = '';
	} else {
		mainContentEl.style.height = '';
		mainContentEl.style.minHeight = innerHeight - footer - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - (innerWidth <= 1500 ? 6 : 12) - mainBottomPad + 'px';
		if (sidebar) {
			if (innerWidth > 1500) sidebar.style.height = mainContentEl.style.minHeight;
			else sidebar.style.height = '';
		}
	}
};

function request(uri, callback, params) {
	var i = new XMLHttpRequest();
	i.open('POST', uri, true);
	i.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	i.send(params);
	i.onload = function() {
		callback(this.status == 200 ? this.responseText : 'Error: HTTP ' + this.status + ' ' + this.statusText);
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