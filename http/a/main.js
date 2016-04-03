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
	return isNaN(h) ? Math.min(this, l) : Math.max(Math.min(this, h), l);
};
HTMLCollection.prototype.indexOf = NodeList.prototype.indexOf = Array.prototype.indexOf;
HTMLCollection.prototype.forEach = NodeList.prototype.forEach = Array.prototype.forEach;
HTMLElement.prototype.insertAfter = function(newEl, refEl) {
	if (refEl.nextSibling) refEl.parentNode.insertBefore(newEl, refEl.nextSibling);
	else refEl.parentNode.appendChild(newEl);
};

function html(input) {
	return input.toString().replaceAll(['&', '<', '>', '"', '\t', '\n', '\b'], ['&amp;', '&lt;', '&gt;', '&quot;', '&#9;', '&#10;', '']);
}

var mdWarnings = [];
function warning(message) {
	console.log(message);
	mdWarnings.push(message);
}
function parseURL(url) {
	var match = url.match(/(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(\\?(?:[^#]*))?(#(?:.*))?/);
	return {
		scheme: match[1] || '',
		host: match[2] || '',
		path: match[3] || '',
		query: match[4] || '',
		fragment: match[5] || ''
	};
}
function spanMarkdown(input) {
	input = html(input);
	while (/\^([\w\^]+)/.test(input)) input = input.replace(/\^([\w\^]+)/, '<sup>$1</sup>');
	return input
		.replaceAll('\u0001', '^')
		.replace(/\[(.+?)\|(.+?)\]/g, '<abbr title="$2">$1</abbr>')
		.replaceAll('\u0002', '[')
		.replace(/\[\[(\d+)\](.*?)\]/g, '<sup class="reference" title="$2">[$1]</sup>')
		.replace(/\[\[ !\[([^\[\]]+?)]\(https?:\/\/([^\s("\\]+?\.[^\s"\\]+?)\) \]\]/g, '<img alt="$1" class="center" src="https://$2" />')
		.replace(/!\[([^\[\]]+?)]\(https?:\/\/([^\s("\\]+?\.[^\s"\\]+?)\)/g, '<img alt="$1" src="https://$2" />')
		.replace(/\[([^\[\]]+)]\((https?:\/\/[^\s()"\[\]]+?\.[^\s"\\\[\]]+?)\)/g, '$1'.link('$2'))
		.replace(/(\s|^)https?:\/\/([^\s()"]+?\.[^\s"]+?\.(svg|png|tiff|jpg|jpeg)(\?[^\s"\/]*)?)/g, '$1<img src="https://$2" />')
		.replace(/(\s|^)(https?:\/\/([^\s()"]+?\.[^\s"()]+))/g, function(m, p1, p2, p3) {
			var parsed = parseURL(p2.replace('youtu.be/', 'youtube.com/watch?v='));
			var i;
			if (
				/(^|.+\.)youtube\.com$/.test(parsed.host) && (i = parsed.query.match(/^\?(.+?&)?v=([^&]+)/))
			) return '<div class="max-width"><div class="iframe-16-9"><iframe src="https://www.youtube.com/embed/' + i[2] + '" frameborder="0" allowfullscreen=""></iframe></div></div>';
			return p1 + p3.link(p2);
		});
}
function inlineMarkdown(input) {
	var output = '',
		span = '',
		current = [],
		tags = {
			'`': 'code',
			'``': 'samp',
			'*': 'em',
			'**': 'strong',
			'_': 'i',
			'–––': 's',
			'+++': 'ins',
			'---': 'del',
			'[c]': 'cite',
			'[m]': 'mark',
			'[u]': 'u',
			'[v]': 'var',
			'::': 'kbd',
			'"': 'q'
		},
		stags = {
			sup: {
				start: '^(',
				end: ')^'
			},
			sub: {
				start: 'v(',
				end: ')v'
			},
			small: {
				start: '[sm]',
				end: '[/sm]'
			}
		};
	outer: for (var i = 0; i < input.length; i++) {
		if (['code', 'samp'].indexOf(current[current.length - 1]) == -1) {
			if (input[i] == '\\') span += input[++i].replace('^', '\u0001').replace('[', '\u0002');
			else {
				for (var l = 3; l > 0; l--) {
					if (tags[input.substr(i, l)]) {
						output += spanMarkdown(span);
						span = '';
						if (current[current.length - 1] == tags[input.substr(i, l)]) output += '</' + current.pop() + '>';
						else {
							if (current.indexOf(tags[input.substr(i, l)]) != -1) warning('Illegal nesting of "' + input.substr(i, l) + '"');
							output += '<' + tags[input.substr(i, l)] + '>';
							current.push(tags[input.substr(i, l)]);
						}
						i += l - 1;
						continue outer;
					}
				}
				for (var j in stags) {
					for (var l = 5; l > 0; l--) {
						if (stags[j].start == input.substr(i, l)) {
							output += spanMarkdown(span) + '<' + j + '>';
							span = '';
							current.push(j);
							i += l - 1;
							continue outer;
						} else if (stags[j].end == input.substr(i, l)) {
							if (stags[current[current.length - 1]] == stags[j]) {
								output += spanMarkdown(span) + '</' + j + '>';
								span = '';
								current.pop();
								i += l - 1;
								continue outer;
							} else warning('Illegal close tag "' + stags[j].end + '" found');
						}
					}
				}
				span += input[i];
			}
		} else if (current[current.length - 1] == 'code' && input[i] == '`') {
			current.pop();
			output += '</code>';
		} else if (current[current.length - 1] == 'samp' && input.substr(i, 2) == '``') {
			current.pop();
			output += '</samp>';
			i++;
		} else output += html(input[i]);
	}
	output += spanMarkdown(span);
	if (current.length) warning('Unclosed tags. <' + current.join('>, <') + '>');
	for (var i = current.length - 1; i >= 0; i--) output += '</' + current[i] + '>';
	return output;
}
function markdown(input) {
	var blockquote = '',
		ul = '',
		ol = '',
		li = '',
		code = '';
	return input.split('\n').map(function(val, i, arr) {
		if (!val) return '';
		var f;
		if (val.substr(0, 2) == '> ') {
			val = val.substr(2);
			if (arr[i + 1] && arr[i + 1].substr(0, 2) == '> ') {
				blockquote += val + '\n';
				return '';
			} else {
				var arg = blockquote + val;
				blockquote = '';
				return '<blockquote>' + markdown(arg) + '</blockquote>';
			}
		} else if (val.substr(0, 3) == '>! ') {
			val = val.substr(3);
			if (arr[i + 1] && arr[i + 1].substr(0, 3) == '>! ') {
				blockquote += val + '\n';
				return '';
			} else {
				var arg = blockquote + val;
				blockquote = '';
				return '<blockquote class="spoiler">' + markdown(arg) + '</blockquote>';
			}
		} else if (val.substr(0, 2) == '- ' || val.substr(0, 2) == '* ') {
			if (!ul) ul = '<ul>';
			val = val.substr(2);
			if (li) {
				ul += '<li>' + markdown(li) + '</li>';
				li = '';
			}
			if (arr[i + 1] && (arr[i + 1].substr(0, 2) == '- ' || arr[i + 1] && arr[i + 1].substr(0, 2) == '* ')) {
				ul += '<li>' + inlineMarkdown(val) + '</li>';
				return '';
			} else if (arr[i + 1] && (arr[i + 1][0] == '\t' || arr[i + 1] && arr[i + 1].substr(0, 4) == '    ')) {
				li += val + '\n';
				return '';
			} else {
				var arg = ul + '<li>' + inlineMarkdown(val) + '</li>';
				ul = '';
				return arg + '</ul>';
			}
		} else if (f = val.match(/^(\d+|[A-z])[.)] /)) {
			if (!ol) ol = '<ol>';
			val = val.substr(f[0].length);
			if (li) {
				ol += '<li>' + markdown(li) + '</li>';
				li = '';
			}
			if (/^(\d+|[A-z])[.)] /.test(arr[i + 1])) {
				ol += '<li>' + inlineMarkdown(val) + '</li>';
				return '';
			} else if (arr[i + 1] && (arr[i + 1][0] == '\t' || arr[i + 1] && arr[i + 1].substr(0, 4) == '    ')) {
				li += val + '\n';
				return '';
			} else {
				var arg = ol + '<li>' + inlineMarkdown(val) + '</li>';
				ol = '';
				return arg + '</ol>';
			}
		} else if (li && val[0] == '\t') {
			li += val.substr(1) + '\n';
			if (ul && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    ' && arr[i + 1].substr(2) != '- ' && arr[i + 1].substr(2) != '* '))) {
				var arg = ul + '<li>' + markdown(li) + '</li>';
				li = '';
				return arg + '</ul>';
			} else if (ol && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    '))) {
				var arg = ol + '<li>' + markdown(li) + '</li>';
				li = '';
				return arg + '</ol>';
			}
			return '';
		} else if (li && val.substr(0, 4) == '    ') {
			li += val.substr(4) + '\n';
			if (ul && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    ' && arr[i + 1].substr(2) != '- ' && arr[i + 1].substr(2) != '* '))) {
				var arg = ul + '<li>' + markdown(li) + '</li>';
				li = '';
				return arg + '</ul>';
			} else if (ol && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    '))) {
				var arg = ol + '<li>' + markdown(li) + '</li>';
				li = '';
				return arg + '</ol>';
			}
			return '';
		} else if (val[0] == '\t') {
			code += val.substr(1);
			if (!arr[i + 1] || (arr[i + 1].substr(0, 4) != '    ' && arr[i + 1][0] != '\t')) {
				var arg = html(code);
				code = '';
				return '<code class="blk">' + arg + '</code>';
			} else code += '\n';
			return '';
		} else if (val.substr(0, 4) == '    ') {
			code += val.substr(4);
			if (!arr[i + 1] || (arr[i + 1].substr(0, 4) != '    ' && arr[i + 1][0] != '\t')) {
				var arg = html(code);
				code = '';
				return '<code class="blk">' + arg + '</code>';
			} else code += '\n';
			return '';
		} else if ((f = val.match(/^#{1,6} /)) && (f = f[0].length - 1)) {
			return '<h' + f + '>' + inlineMarkdown(val.substr(f + 1)) + '</h' + f + '>';
		} else if (/^[-–—]{12,}$/.test(val)) {
			return '<hr />';
		} else if (i = val.match(/^cite\[(\d+)\]: /)) {
			return '<div><sup class="reference-list">' + i[1] + '</sup> ' + inlineMarkdown(val.substr(i[0].length)) + '</div>';
		} else return '<p>' + inlineMarkdown(val) + '</p>';
	}).join('');
}

function mdValidate(correct) {
	var i = mdWarnings.length;
	markdown(this.value);
	var preverr = this.previousElementSibling && this.previousElementSibling.classList.contains('md-err') ? this.previousElementSibling : null,
		err = mdWarnings[i];
	this.lastErrored = err && correct;
	if (err && (correct || preverr || /\s$/.test(this.value.substr(0, this.selectionEnd || Infinity)))) {
		if (preverr) {
			if (preverr.firstChild.nodeValue == err) {
				if (this.lastErrored && err && correct) {
					this.value = this.value.replace(/([^\\]?)(\\*)([`*_–\-+[(:"])/g, function(m, p1, p2, p3, i) {
						if (i && !p1) return m;
						return p1 + (p2.length % 2 ? p2 : p2 + '\\') + p3;
					});
					return true;
				}
				return err;
			}
			preverr.parentNode.removeChild(preverr);
		}
		var span = document.createElement('span');
		span.classList.add('md-err');
		span.appendChild(document.createTextNode(err));
		this.parentNode.insertBefore(span, this);
	} else if (preverr) preverr.parentNode.removeChild(preverr);
	return err;
}
HTMLTextAreaElement.prototype.mdValidate = mdValidate;

function mdValidateBody() {
	if (document.activeElement.mdValidate && document.activeElement.spellcheck) document.activeElement.mdValidate();
}
addEventListener('input', mdValidateBody);

function passStrength(pass) {
	var uniqueChars = [];
	for (var i = 0; i < pass.length; i++) {
		if (uniqueChars.indexOf(pass[i]) == -1) uniqueChars.push(pass[i]);
	}
	var penalties = /(.+?)(.*)(\1+)/g,
		match,
		deductions = 0;
	while (match = penalties.exec(pass)) deductions += (4 - match[2].length/2).bound(0.5, 3) * Math.pow(match[1].length + match[3].length, 1.4) / Math.sqrt(match[1].length + 3);
	penalties = /\d+/g;
	while (match = penalties.exec(pass)) deductions += Math.pow(match[0].length, 3/2);
	penalties = /\w{2,}/gi;
	while (match = penalties.exec(pass)) deductions += match[0].length * 1.5;
	return 1 - 1 / (1 + Math.pow(2, uniqueChars.length / 2 - Math.pow(deductions, 2/3) / 10 + pass.length / 8 - 8));
}

function request(uri, callback, params) {
	var i = new XMLHttpRequest();
	i.open('POST', uri, true);
	i.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	i.send(params);
	i.onload = function() {
		callback(this.status == 204 ? 'Success' : this.responseText);
	};
	return i;
}

function ago(od) {
	var d = Math.round((new Date() - od) / 1000);
	if (d < 3600) return Math.round(d / 60) + 'm ago';
	else if (d < 86400) return Math.round(d / 3600) + 'h ago';
	else if (d < 2592000) return Math.round(d / 86400) + 'd ago';
	else {
		d = new Date(od);
		var y = d.getUTCFullYear();
		return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' + d.getUTCDate() + (y == new Date().getUTCFullYear() ? '' : ' \'' + y.toString().substr(2));
	}
}
function agot(d) {
	var time = document.createElement('time');
	time.textContent = ago(d);
	time.setAttribute('datetime', new Date(d).toISOString());
	return time;
}

function textareaHandler(e, s) {
	if (this.noHandle) return delete this.nHandle;
	if (!this.hist) this.hist = [{
		body: '',
		start: 0,
		end: 0
	}];
	if (!this.hIndex) this.hIndex = 0;
	if (!s && e.keyCode == 9) {
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
		if (this.hist[this.hIndex].body == this.value) return;
		this.hist.push({
			body: this.value,
			start: this.selectionStart,
			end: this.selectionEnd
		});
		this.hIndex = this.hist.length - 1;
		e.preventDefault();
	} else if (e.keyCode == 90 && e.metaKey && !e.altKey) {
		e.preventDefault();
		if (this.hIndex == this.hist.length - 1 && this.hist[this.hIndex].body != this.value) {
			this.hist.push({
				body: this.value,
				start: this.selectionStart,
				end: this.selectionEnd
			});
			this.hIndex = this.hist.length - 1;
		}
		var data = this.hist[e.shiftKey ? ++this.hIndex : --this.hIndex];
		if (data) {
			this.value = data.body;
			this.selectionStart = data.start;
			this.selectionEnd = data.end;
		} else e.shiftKey ? --this.hIndex : ++this.hIndex;
	} else {
		if (this.hist[this.hIndex].body != this.value) this.hist = this.hist.slice(0, this.hIndex + 1);
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(function(e) {
			if (e.hIndex != e.hist.length - 1) return;
			if (e.hist[e.hIndex].body == e.value) return;
			e.hist.push({
				body: e.value,
				start: e.selectionStart,
				end: e.selectionEnd
			});
			e.hIndex = e.hist.length - 1;
		}, this.lastKeyCode == e.keyCode || [8, 13].indexOf(e.keyCode) == -1 ? 200 : e.metaKey || e.shiftKey ? 100 : 0, this);
	}
	this.lastKeyCode = e.keyCode;
}

function updateTimes() {
	var times = document.getElementsByTagName('time');
	for (var i = 0; i < times.length; i++) {
		var t = ago(Date.parse(times[i].getAttribute('datetime')));
		if (times[i].textContent != t) times[i].textContent = t;
	}
}

addEventListener('DOMContentLoaded', function() {
	if (navigator.userAgent.indexOf('Trident') != -1 || navigator.userAgent.indexOf('MSIE') != -1) {
		var span = document.createElement('span');
		span.appendChild(document.createTextNode('This site does not support Microsoft Internet Explorer due to its lack of compatibility with web specifications.'));
		document.getElementById('err').appendChild(span);
		document.getElementById('content').hidden = true;
	}
	var markread = document.getElementById('markread');
	if (markread) markread.onclick = function() {
		request('/api/me/clearnotifs', function(res) {
			if (res != 'Success') return alert(res);
			document.querySelector('#nav > div:nth-of-type(2) > a:nth-child(2)').classList.remove('unread');
			document.getElementById('notifs').innerHTML = '';
		});
	}
	var e = document.getElementsByTagName('textarea'),
		i = e.length;
	while (i--) {
		e[i].addEventListener('keyup', function() {
			textareaHandler.call(this, true);
		});
		e[i].addEventListener('keydown', textareaHandler);
		e[i].addEventListener('keypress', textareaHandler);
	}
	updateTimes();
	setInterval(updateTimes, 100);
	var navAnchors = document.querySelectorAll('#nav > div > a');
	for (var i = 0; i < navAnchors.length; i++) {
		if (navAnchors[i].children.length - 1) navAnchors[i].addEventListener('touchstart', function(e) {
			if (innerWidth >= 800 && (this.dataset.clicked ^= 1)) {
				e.preventDefault();
				e.stopPropagation();
				for (var i = 0; i < navAnchors.length; i++) if (navAnchors[i] != this) navAnchors[i].dataset.clicked = 0;
			}
		});
	}
	addEventListener('touchstart', function() {
		if (innerWidth >= 800) for (var i = 0; i < navAnchors.length; i++) navAnchors[i].dataset.clicked = 0;
	});
	applyProgramIframes();
});

function applyProgramIframes() {
	var e = document.getElementsByClassName('html-program'),
		i = e.length;
	while (i--) {
		var j = e[i].parentNode.parentNode;
		if (e[i].src || j.getBoundingClientRect().top - j.parentNode.getBoundingClientRect().top > j.parentNode.offsetHeight) continue;
		var outputBlob = new Blob([
			'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><body>' + e[i].dataset.html + '<style>html{zoom:0.5}' + html(e[i].dataset.css) + '</style><script>alert=prompt=confirm=null;' + html(e[i].dataset.js) + '</script></body></html>'
		], {type: 'application/xhtml+xml'});
		e[i].src = URL.createObjectURL(outputBlob);
	}
	e = document.getElementsByClassName('canvas-program');
	i = e.length;
	if (i) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', '/dev/canvas.js', true);
		xhr.send();
		xhr.onload = function() {
			while (i--) {
				var j = e[i].parentNode.parentNode;
				if (e[i].src || j.getBoundingClientRect().top - j.parentNode.getBoundingClientRect().top > j.parentNode.offsetHeight) continue;
				var outputBlob = new Blob([
					'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Output frame</title></head><style>*{margin:0;max-width:100%;box-sizing:border-box}body{background:#000;color:#fff}#canvas{-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;padding:4px;overflow:auto;margin-top:8px}button,canvas{display:block}button{margin-top:6px}</style><body><canvas id="canvas"></canvas><div id="console"></div><button onclick="location.reload()">Restart</button><script>\'use strict\';' + html(this.responseText) + 'try{this.eval(' + html(JSON.stringify(e[i].dataset.code)) + ')}catch(e){error(e)}</script></body></html>'
				], {type: 'application/xhtml+xml'});
				e[i].src = URL.createObjectURL(outputBlob);
			}
		};
	}
}
addEventListener('resize', applyProgramIframes);

document.addEventListener('visibilitychange', function() {
	if (!document.hidden && document.querySelector('#nav > div:nth-of-type(2) > a:nth-child(2) span').firstChild.nodeValue != 'Log in') {
		request('/api/me/notif', function(res) {
			document.querySelector('#nav > div:nth-of-type(2) > a:nth-child(2)').classList.toggle('unread', res);
			document.getElementById('notifs').innerHTML = res;
		});
	}
});

if (navigator.userAgent.indexOf('Mobile') != -1) addEventListener('touchend', function() {}); //Fixes mobile-safari bug with touch listeners in iframes not firing

function jsKeypressHandler(e) {
	var oldSelectionStart = this.selectionStart;
	var pairChars = {};
	pairChars[40] = '()';
	pairChars[91] = '[]';
	pairChars[123] = '{}';
	var endChars = {};
	endChars[41] = ')';
	endChars[93] = ']';
	endChars[125] = '}';
	if (e.keyCode == 13) {
		if (e.metaKey) return document.getElementById('title').dispatchEvent(new MouseEvent('click'));
		var cut = /[\n^]\s+$/.test(this.value.substr(0, oldSelectionStart)) ? 0 : (this.value.substr(0, oldSelectionStart).match(/[\t ]+$/) || '').length;
		this.value = this.value.substr(0, oldSelectionStart - cut) + this.value.substr(oldSelectionStart);
		oldSelectionStart = this.selectionStart = this.selectionEnd = oldSelectionStart - cut;
		var tabs = this.value.substr(0, oldSelectionStart)
			.split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1]
			.split('\t').length
			- (
				('{([:,'.indexOf(this.value[oldSelectionStart - 1]) + 1)
				? 0
				: (
					['}', ')', ']'].indexOf(this.value[oldSelectionStart]) == -1
					? 1
					: 2
				)
			);
			this.value =
				this.value.substr(0, oldSelectionStart) + '\n' + '\t'.repeat(tabs) +
				(
					'{(['.indexOf(this.value[oldSelectionStart - 1]) == -1 || '{([])}'.indexOf(this.value[oldSelectionStart]) == -1
					? ''
					: '\n' + '\t'.repeat(tabs - 1)
				) + this.value.substr(oldSelectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart + tabs;
		e.preventDefault();
	} else if (e.keyCode == 34) {
		if (this.value[this.selectionStart] != '"') this.value = this.value.substr(0, this.selectionStart) + '""' + this.value.substr(this.selectionEnd);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.keyCode == 39) {
		if (this.value[this.selectionStart] != "'") this.value = this.value.substr(0, this.selectionStart) + "''" + this.value.substr(this.selectionEnd);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (pairChars[e.keyCode]) {
		this.value = this.value.substr(0, this.selectionStart) + pairChars[e.keyCode] + this.value.substr(this.selectionEnd);
		this.selectionEnd = ++oldSelectionStart;
		e.preventDefault();
	} else if (endChars[e.keyCode] && this.value[this.selectionStart] == endChars[e.keyCode] && this.selectionStart == this.selectionEnd) {
		this.selectionStart = ++this.selectionEnd;
		e.preventDefault();
	} else if (this.id != 'css' && e.keyCode == 61 && /(draw|refresh) $/.test(this.value.substr(0, this.selectionStart))) {
		var tabs = this.value.substr(0, oldSelectionStart).split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1].split('\t').length;
		this.value = this.value.substr(0, this.selectionStart) + '= function() {\n' + '\t'.repeat(tabs) + '\n' + '\t'.repeat(tabs - 1) + '}' + this.value.substr(this.selectionEnd);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 15 + tabs;
		e.preventDefault();
	} else if (this.id != 'css' && e.keyCode == 116 && /func$/.test(this.value.substr(0, this.selectionStart))) {
		var tabs = this.value.substr(0, oldSelectionStart).split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1].split('\t').length;
		this.value = this.value.substr(0, this.selectionStart) + 'tion () {\n' + '\t'.repeat(tabs) + '\n' + '\t'.repeat(tabs - 1) + '}' + this.value.substr(this.selectionEnd);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 5;
		e.preventDefault();
	} else if (e.keyCode == 44) {
		this.value = this.value.substr(0, this.selectionStart) + ', ' + this.value.substr(this.selectionEnd);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 2;
		e.preventDefault();
	} else if (this.id != 'css' && e.keyCode == 58) {
		this.value = this.value.substr(0, this.selectionStart) + ': ' + this.value.substr(this.selectionEnd);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 2;
		e.preventDefault();
	} else if (e.keyCode == 125 && this.value[this.selectionStart - 1] == '\t') {
		this.value = this.value.substr(0, this.selectionStart - 1) + '}' + this.value.substr(this.selectionEnd);
		this.selectionEnd = this.selectionStart = oldSelectionStart;
		e.preventDefault();
	}
}

function highlightHTML(codeBlock, input, fullHTML) {
	input = typeof(input) == 'string' ? input : codeBlock.textContent;
	var chunk = '',
		warnings = [],
		line = 1,
		inCD = false,
		inComment = false,
		inEntity = false,
		inPI = false,
		inTag = false,
		inCloseTag = false,
		inAttr = false,
		inAttrValue = false,
		tagName = '',
		fc;
	while (fc = codeBlock.firstChild) codeBlock.removeChild(fc);
	var linenum = document.createElement('span');
	linenum.className = 'line';
	linenum.dataset.linenum = line;
	codeBlock.appendChild(linenum);
	function endCD() {
		if (!chunk) return;
		var cd = document.createElement('span');
		cd.appendChild(document.createTextNode(chunk));
		cd.className = 'cdata';
		codeBlock.appendChild(cd);
		chunk = '';
	}
	function endComment() {
		if (!chunk) return;
		var comment = document.createElement('span');
		comment.appendChild(document.createTextNode(chunk));
		comment.className = 'inline-comment';
		codeBlock.appendChild(comment);
		chunk = '';
	}
	function endEntity() {
		if (!chunk) return;
		var ent = document.createElement('span');
		ent.appendChild(document.createTextNode(chunk));
		ent.className = 'entity';
		codeBlock.appendChild(ent);
		chunk = '';
	}
	function endPI() {
		if (!chunk) return;
		var pi = document.createElement('span');
		pi.appendChild(document.createTextNode(chunk));
		pi.className = 'processing-instruction';
		codeBlock.appendChild(pi);
		chunk = '';
	}
	function endTag() {
		if (!chunk) return;
		var tag = document.createElement('span');
		tag.appendChild(document.createTextNode(chunk));
		if (!inCloseTag && (chunk[chunk.length - 1] == '>' || /\n|\s*($|<[^/])/.test(chunk.substr(i))) && (chunk.length == 1 || chunk[chunk.length - 2] != '/')) {
			tag.dataset.tagname = tagName;
			tagName = '';
			tag.className = 'xml-tag end-start-tag';
		} else tag.className = 'xml-tag';
		codeBlock.appendChild(tag);
		chunk = '';
	}
	function endAttr() {
		if (!chunk) return;
		var i;
		if ((i = chunk.indexOf(':')) != -1) {
			var attrns = document.createElement('span');
			attrns.appendChild(document.createTextNode(chunk.substr(0, i)));
			attrns.className = 'xml-attr-ns';
			codeBlock.appendChild(attrns);
			var colon = document.createElement('span');
			colon.appendChild(document.createTextNode(':'));
			colon.className = 'punctuation';
			codeBlock.appendChild(colon);
			chunk = chunk.substr(i + 1);
		}
		var attr = document.createElement('span');
		attr.appendChild(document.createTextNode(chunk));
		attr.className = 'xml-attr';
		codeBlock.appendChild(attr);
		chunk = '';
	}
	function endAttrValue() {
		if (!chunk) return;
		var val = document.createElement('span');
		val.appendChild(document.createTextNode(chunk));
		val.className = 'xml-attr-value';
		codeBlock.appendChild(val);
		chunk = '';
	}
	function end() {
		if (inCD) endCD();
		else if (inPI) endPI();
		else if (inComment) endComment();
		else if (inAttrValue) endAttrValue();
		else if (inAttr) endAttr();
		else if (inTag) endTag();
		else {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
		}
	}
	for (var i = 0; i < input.length; i++) {
		if (input.substr(i - 9, 9).toLowerCase() == '<!doctype' && !fullHTML) warnings.push([i, 'No need for doctype, you\'re writing inside the body.']);
		var c = input[i];
		if (c == '\n') {
			end();
			codeBlock.appendChild(document.createTextNode('\n'));
			var linenum = document.createElement('span');
			linenum.className = 'line';
			linenum.dataset.linenum = ++line;
			codeBlock.appendChild(linenum);
		} else if (inCD) {
			chunk += c;
			if (input.substr(i - 2, 3) == ']]>') {
				endCD();
				inCD = false;
			}
		} else if (inComment) {
			chunk += c;
			if (input.substr(i - 2, 3) == '-->') {
				endComment();
				inComment = false;
			}
			if (input.substr(i, 2) == '--' && input[i + 2] != '>') warnings.push([i, 'Invalid double-dash inside comment.']);
		} else if (inEntity) {
			chunk += c;
			if (c == ';') {
				endEntity();
				inEntity = false;
			}
		} else if (c == '&') {
			end();
			chunk = '&';
			inEntity = true;
		} else if (inPI) {
			chunk += c;
			if (input.substr(i - 1, 2) == '?>') {
				endPI();
				inPI = false;
			}
		} else if (inTag) {
			if (c == '<') {
				endTag();
				chunk = '<';
				if (input[i + 1] == '/') inCloseTag = true;
			} else if (c == '>') {
				chunk += '>';
				endTag();
				inTag = inCloseTag = inAttr = inAttrValue = false;
			} else if (!inAttr && !inAttrValue && /\s/.test(c)) {
				endTag();
				chunk = c;
				inAttr = true;
			} else if (inAttr && (c == '"' || c == "'")) {
				endAttr();
				chunk = c;
				inAttr = false;
				inAttrValue = c;
			} else if (inAttrValue == c) {
				chunk += c;
				endAttrValue();
				inAttr = true;
				inAttrValue = false;
			} else if (!inAttr && !inAttrValue) {
				chunk += c;
				tagName += c;
			} else chunk += c;
		} else if (input.substr(i, 9) == '<![CDATA[') {
			end();
			chunk = '<![CDATA[';
			i += 8;
			inCD = true;
		} else if (input.substr(i, 4) == '<!--') {
			end();
			chunk = '<!--';
			i += 3;
			inComment = true;
		} else if (input.substr(i, 2) == '<?') {
			end();
			chunk = '<?';
			i++;
			inPI = true;
		} else if (c == '<') {
			end();
			chunk = '<';
			inTag = true;
			if (input[i + 1] == '/') inCloseTag = true;
		} else chunk += c;
	}
	end();
	codeBlock.appendChild(document.createTextNode('\xa0'));
	codeBlock.dataset.line = Math.floor(Math.log10(line));
	var lines = input.split('\n');
	for (var i = 0; i < warnings.length; i++) {
		var line = input.substr(0, warnings[i][0]).split('\n').length - 1,
			lineEl = codeBlock.getElementsByClassName('line')[line];
		lineEl.classList.add('warning');
		if (lineEl.title) lineEl.title += '\n';
		lineEl.title += 'Column ' + (warnings[i][0] - lines.slice(0, line).join('\n').length) + ': ' + warnings[i][1];
	}
}

function highlightCSS(codeBlock, input) {
	input = typeof(input) == 'string' ? input : codeBlock.textContent;
	var chunk = '',
		warnings = [],
		line = 1,
		inComment = false,
		inSelector = true,
		inValue = false,
		inValueString = false,
		inAttr = false,
		inAttrValue = false,
		inNth = false,
		inAt = false,
		inAtNoNest = false,
		fc;
	while (fc = codeBlock.firstChild) codeBlock.removeChild(fc);
	var linenum = document.createElement('span');
	linenum.className = 'line';
	linenum.dataset.linenum = line;
	codeBlock.appendChild(linenum);
	function endComment() {
		var comment = document.createElement('span');
		comment.className = 'inline-comment';
		comment.appendChild(document.createTextNode(chunk));
		codeBlock.appendChild(comment);
		chunk = '';
	}
	function endSel() {
		if (!chunk) return;
		var inSub = false,
			inClass = false,
			inID = false,
			inPseudoClass = false,
			inPseudoElement = false,
			inRefComb = false,
			schunk = '';
		function endSChunk() {
			if (!schunk) return;
			if (inSub) {
				var span = document.createElement('span');
				span.className = inClass ? 'class' : inID ? 'id' :
					inPseudoClass ? (schunk == ':not' || schunk == ':matches' ? 'pseudo-class logical' : 'pseudo-class') :
					inPseudoElement ? 'pseudo-element' : inRefComb ? 'reference-combinator' : 'element';
				span.appendChild(document.createTextNode(schunk));
				codeBlock.appendChild(span);
				inSub = inClass = inID = inPseudoClass = inPseudoElement = false;
			} else codeBlock.appendChild(document.createTextNode(schunk));
			schunk = '';
		}
		for (var i = 0; i < chunk.length; i++) {
			var c = chunk[i];
			if (c == '\n') {
				if (schunk) endSChunk();
				var linenum = document.createElement('span');
				linenum.className = 'line';
				linenum.dataset.linenum = ++line;
				codeBlock.appendChild(linenum);
			} else if (/\s/.test(c) || ['>', '+', '~', '|', ','].indexOf(c) != -1) {
				if (inSub) endSChunk();
				schunk += c;
			} else if (c == '*') {
				endSChunk();
				var star = document.createElement('span');
				star.className = 'universal';
				star.appendChild(document.createTextNode('*'));
				codeBlock.appendChild(star);
			} else if (inPseudoClass && c == '(') {
				endSChunk();
				var paren = document.createElement('span');
				paren.className = 'punctuation';
				paren.appendChild(document.createTextNode('('));
				codeBlock.appendChild(paren);
			} else if (c == ')' || c == '}') {
				endSChunk();
				var punc = document.createElement('span');
				punc.className = 'punctuation';
				punc.appendChild(document.createTextNode(c));
				codeBlock.appendChild(punc);
			} else if (c == '.') {
				endSChunk();
				inSub = inClass = true;
				schunk = '.';
			} else if (c == '#') {
				endSChunk();
				inSub = inID = true;
				schunk = '#';
			} else if (c == '/') {
				endSChunk();
				inSub = inRefComb = true;
				schunk = '/';
			} else if (c == ':') {
				endSChunk();
				inSub = true;
				if (chunk[i + 1] == ':') {
					inPseudoElement = true;
					schunk = '::';
					i++;
				} else {
					inPseudoClass = true;
					schunk = ':';
				}
			} else if (!inSub) {
				endSChunk();
				inSub = true;
				schunk = c;
			} else schunk += c;
		}
		endSChunk();
		chunk = '';
	}
	function endProp() {
		if (!chunk) return;
		var prop = document.createElement('span');
		prop.appendChild(document.createTextNode(chunk));
		prop.className = 'property';
		codeBlock.appendChild(prop);
		chunk = '';
	}
	function endValueString() {
		if (!chunk) return;
		var vs = document.createElement('span'),
			schunk = '';
		function endSChunk() {
			if (!schunk) return;
			vs.appendChild(document.createTextNode(schunk));
			schunk = '';
		}
		for (var i = 0; i < chunk.length; i++) {
			var c = chunk[i];
			if (c == '\\') {
				endSChunk();
				var esc = document.createElement('span');
				esc.className = 'escape';
				esc.appendChild(document.createTextNode(c + (chunk[i + 1] ? chunk[++i] : '')));
				vs.appendChild(esc);
			} else schunk += c;
		}
		endSChunk();
		vs.className = 'value string';
		codeBlock.appendChild(vs);
		chunk = '';
	}
	function endVal() {
		if (!chunk) return;
		var val = document.createElement('span'),
			schunk = '',
			keywords = ['inherit', 'initial', 'unset', 'default', 'revert', '!important', 'left', 'center', 'right', 'top', 'bottom'],
			units = ['%', 'em', 'ex', 'ch', 'rem', 'vw', 'vh', 'vmin', 'vmax', 'cm', 'mm', 'q', 'in', 'qc', 'qt', 'px', 'deg', 'grad', 'rad', 'turn', 's', 'ms', 'Hz', 'kHz', 'dpi', 'dpcm', 'dppx'],
			colors = ['transparent', 'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen'];
		function endSChunk(className) {
			if (className) {
				var span = document.createElement('span');
				span.className = className;
				span.appendChild(document.createTextNode(schunk));
				val.appendChild(span);
			} else val.appendChild(document.createTextNode(schunk));
			schunk = '';
		}
		outer: for (var i = 0; i < chunk.length; i++) {
			var c = chunk[i];
			for (var j = 0; j < keywords.length; j++) {
				if (chunk.substr(i, keywords[j].length) == keywords[j]) {
					endSChunk();
					var keyword = document.createElement('span');
					keyword.className = keywords[j] == '!important' ? 'bad keyword' : 'keyword';
					keyword.appendChild(document.createTextNode(keywords[j]));
					val.appendChild(keyword);
					i += keywords[j].length - 1;
					continue outer;
				}
			}
			for (var j = 0; j < colors.length; j++) {
				if (chunk.substr(i, colors[j].length) == colors[j]) {
					endSChunk();
					var color = document.createElement('span');
					color.className = 'color';
					color.appendChild(document.createTextNode(colors[j]));
					val.appendChild(color);
					i += colors[j].length - 1;
					continue outer;
				}
			}
			if (c == '(' || c == ')' || c == ',') {
				endSChunk(c == '(' ? 'function-call' : '');
				var punc = document.createElement('span');
				punc.className = 'punctuation';
				punc.appendChild(document.createTextNode(c));
				val.appendChild(punc);
			} else if (c == '+' || (c == '-' && !/\w/.test(input[i - 1])) || c == '*' || c == '/') {
				endSChunk();
				var op = document.createElement('span');
				op.className = 'operator';
				op.appendChild(document.createTextNode(c));
				val.appendChild(op);
			} else if (c == '#') {
				endSChunk();
				var start = i;
				i++;
				while (/[\da-fA-F]/.test(chunk[i] || '')) i++;
				schunk = chunk.substring(start, i);
				endSChunk('color');
				i--;
			} else if (/\d/.test(c)) {
				endSChunk();
				var start = i;
				i++;
				while (/\d/.test(chunk[i])) i++;
				if (chunk[i] == '.' && /\d/.test(chunk[i + 1])) i += 2;
				while (/\d/.test(chunk[i])) i++;
				if ((chunk[i] || '').toLowerCase() == 'e' && /\d/.test(chunk[i + 1])) i += 2;
				while (/\d/.test(chunk[i])) i++;
				var tchunk = chunk.substring(start, i);
				schunk = tchunk;
				endSChunk('number');
				for (var j = 0; j < units.length; j++) {
					if (chunk.substr(i, units[j].length) == units[j]) {
						endSChunk();
						var unit = document.createElement('span');
						unit.className = parseFloat(tchunk) ? 'unit' : 'unit bad';
						unit.appendChild(document.createTextNode(units[j]));
						val.appendChild(unit);
						i += units[j].length - 1;
						continue outer;
					}
				}
				i--;
			} else if (/\s/.test(c)) {
				schunk += c;
				endSChunk();
			} else schunk += c;
		}
		endSChunk();
		val.className = 'value';
		codeBlock.appendChild(val);
		chunk = '';
	}
	function endAttrName() {
		if (!chunk) return;
		var an = document.createElement('span');
		an.appendChild(document.createTextNode(chunk));
		an.className = 'attribute-name';
		codeBlock.appendChild(an);
		chunk = '';
	}
	function endAttrValue() {
		if (!chunk) return;
		var av = document.createElement('span');
		av.appendChild(document.createTextNode(chunk));
		av.className = 'attribute-value';
		codeBlock.appendChild(av);
		chunk = '';
	}
	function endNth() {
		inNth.className = 'nth';
		codeBlock.appendChild(inNth);
		inNth = document.createElement('span');
	}
	function endAt() {
		if (!chunk) return;
		if (inAtNoNest) {
			var span = document.createElement('span');
			span.className = 'no-nest';
			span.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(span);
		} else codeBlock.appendChild(document.createTextNode(chunk));
		chunk = '';
	}
	function end() {
		if (inComment) endComment();
		else if (inAt) endAt();
		else if (inSelector) endSel();
		else if (inAttrValue) endAttrValue();
		else if (inAttr) endAttrName();
		else if (inNth) endNth();
		else if (inValueString) endValueString();
		else if (inValue) endVal();
		else endProp();
	}
	for (var i = 0; i < input.length; i++) {
		var c = input[i];
		if (c == '\n') {
			end();
			(inNth || codeBlock).appendChild(document.createTextNode('\n'));
			var linenum = document.createElement('span');
			linenum.className = 'line';
			linenum.dataset.linenum = ++line;
			(inNth || codeBlock).appendChild(linenum);
		} else if (inComment) {
			chunk += c;
			if (input[i - 1] == '*' && c == '/') {
				endComment();
				inComment = false;
			}
		} else if (c == '/' && input[i + 1] == '*') {
			end();
			chunk = c + input[++i];
			inComment = true;
		} else if (inSelector) {
			if (c == '{' || c == '[') {
				endSel();
				codeBlock.appendChild(document.createTextNode(c));
				inSelector = false;
				if (c == '[') inAttr = true;
			} else if (c == '@') {
				endSel();
				inSelector = false;
				inAt = true;
				chunk = '@';
			} else if (c == '(' && chunk.match(/:nth[\w-]+$/)) {
				endSel();
				var paren = document.createElement('span');
				paren.className = 'punctuation';
				paren.appendChild(document.createTextNode('('));
				codeBlock.appendChild(paren);
				inSelector = false;
				inNth = document.createElement('span');
			} else chunk += c;
		} else if (inAttr) {
			if (c == '{' || c == ']') {
				if (inAttrValue) endAttrValue();
				else endAttrName();
				codeBlock.appendChild(document.createTextNode(c));
				inAttr = inAttrValue = false;
				if (c == ']') inSelector = true;
			} else if (!inAttrValue && c == '=') {
				endAttrName();
				codeBlock.appendChild(document.createTextNode('='));
				inAttrValue = true;
			} else if (!inAttrValue && ['~', '^', '$', '*', '|'].indexOf(c) != -1 && input[i + 1] == '=') {
				endAttrName();
				codeBlock.appendChild(document.createTextNode(c + '='));
				inAttrValue = true;
				i++;
			} else chunk += c;
		} else if (inNth) {
			if (c == '{') {
				endNth();
				codeBlock.appendChild(document.createTextNode('{'));
				inNth = false;
			} else if (c == ')') {
				endNth();
				var paren = document.createElement('span');
				paren.className = 'punctuation';
				paren.appendChild(document.createTextNode(')'));
				codeBlock.appendChild(paren);
				inNth = false;
				inSelector = true;
			} else if (input.substr(i, 4) == 'even') {
				var n = document.createElement('span');
				n.className = 'n';
				n.appendChild(document.createTextNode('even'));
				inNth.appendChild(n);
				i += 3;
			} else if (input.substr(i, 3) == 'odd') {
				var n = document.createElement('span');
				n.className = 'n';
				n.appendChild(document.createTextNode('odd'));
				inNth.appendChild(n);
				i += 2;
			} else if (input.substr(i, 2) == 'of') {
				var n = document.createElement('span');
				n.className = 'logical';
				n.appendChild(document.createTextNode('of'));
				inNth.appendChild(n);
				i++;
				endNth();
				inNth = false;
				inSelector = true;
			} else if (c == 'n') {
				var n = document.createElement('span');
				n.className = 'n';
				n.appendChild(document.createTextNode('n'));
				inNth.appendChild(n);
			} else if (/\d/.test(c)) {
				var num = document.createElement('span');
				num.className = 'number';
				num.appendChild(document.createTextNode(input.substring(i, 1 + (i += input.substr(i).match(/\d+/)[0].length - 1))));
				inNth.appendChild(num);
			} else inNth.appendChild(document.createTextNode(c));
		} else if (inAt) {
			if (c == ';' && inAtNoNest) {
				endAt();
				var punc = document.createElement('span');
				punc.className = 'punctuation';
				punc.appendChild(document.createTextNode(';'));
				codeBlock.appendChild(punc);
				inAt = inAtNoNest = false;
				inSelector = true;
			} else if (c == '{') {
				endAt();
				codeBlock.appendChild(document.createTextNode('{'));
				inAt = false;
				inSelector = true;
			} else if (chunk == '@') {
				while ((c = input[i++]) && !/[\s;{]/.test(c)) chunk += c;
				i -= 2;
				if (['@namespace', '@charset', '@import'].indexOf(chunk) != -1) inAtNoNest = true;
				var atName = document.createElement('span');
				atName.appendChild(document.createTextNode(chunk));
				atName.className = 'at-rule-name';
				codeBlock.appendChild(atName);
				chunk = '';
			} else chunk += c;
		} else if (!inValue && c == ':') {
			endProp();
			var colon = document.createElement('span');
			colon.appendChild(document.createTextNode(':'));
			colon.className = 'colon';
			codeBlock.appendChild(colon);
			inValue = true;
		} else if (inValue && !inValueString && (c == '"' || c == "'")) {
			endVal();
			inValueString = chunk = c;
		} else if (c === inValueString && (chunk.match(/\\+$/) || '').length % 2 == 0) {
			chunk += c;
			endValueString();
			inValueString = false;
		} else if (inValue && c == ';') {
			if (inValueString) {
				endValueString();
				inValueString = false;
				warnings.push([i, 'Unexpected end of value with unterminated string.'])
			}
			endVal();
			var semicolon = document.createElement('span');
			semicolon.appendChild(document.createTextNode(';'));
			semicolon.className = 'punctuation';
			codeBlock.appendChild(semicolon);
			inValue = false;
		} else if (c == '}') {
			if (inValue) endVal();
			else endProp();
			codeBlock.appendChild(document.createTextNode('}'));
			inValue = false;
			inSelector = true;
		} else chunk += c;
	}
	end();
	codeBlock.appendChild(document.createTextNode('\xa0'));
	codeBlock.dataset.line = Math.floor(Math.log10(line));
	var lines = input.split('\n');
	for (var i = 0; i < warnings.length; i++) {
		var line = input.substr(0, warnings[i][0]).split('\n').length - 1,
			lineEl = codeBlock.getElementsByClassName('line')[line];
		lineEl.classList.add('warning');
		if (lineEl.title) lineEl.title += '\n';
		lineEl.title += 'Column ' + (warnings[i][0] - lines.slice(0, line).join('\n').length) + ': ' + warnings[i][1];
	}
}

function highlightJS(codeBlock, input) {
	input = typeof(input) == 'string' ? input : codeBlock.textContent;
	var chunk = '',
		warnings = [],
		beforeWord,
		line = 1,
		inVarDec = [],
		d,
		inTemplate = 0,
		fc;
	while (fc = codeBlock.firstChild) codeBlock.removeChild(fc);
	var linenum = document.createElement('span');
	linenum.className = 'line';
	linenum.dataset.linenum = line;
	codeBlock.appendChild(linenum);
	for (var i = 0; i < input.length; i++) {
		var c = input[i],
			l;
		if (c == '"' || c == "'" || c == '`' || (inTemplate && c == '}')) {
			codeBlock.appendChild(document.createTextNode(chunk));
			var enteringTemplate = false;
			if (c == '}') {
				inTemplate--;
				var punc = document.createElement('span');
				punc.className = 'template punctuation';
				punc.appendChild(document.createTextNode('}'));
				codeBlock.appendChild(punc);
				chunk = '';
				c = '`';
			} else chunk = c;
			var string = document.createElement('span');
			string.className = 'string';
			while ((d = input[++i]) && d != c) {
				if (d == '\n') {
					if (c != '`' ) {
						warnings.push([i, 'Unexpected line end with unterminated string literal.']);
						break;
					} else {
						string.appendChild(document.createTextNode(chunk + '\n'));
						chunk = '';
						var linenum = document.createElement('span');
						linenum.className = 'line';
						linenum.dataset.linenum = ++line;
						string.appendChild(linenum);
					}
				} else if (d == '\\') {
					string.appendChild(document.createTextNode(chunk));
					chunk = d;
					if (d = input[++i]) chunk += d;
					else warnings.push([i - 1, 'Incomplete escape sequence.']);
					var escape = document.createElement('span');
					escape.className = 'escape';
					if (d == 'u') {
						if (d = input[++i]) chunk += d;
						if (d == '{') {
							while ((d = input[++i]) && d != '}') {
								if (d == '\n' || d == string) {
									warnings.push([i, 'Unclosed bracket escape sequence.']);
									break;
								}
								chunk += d;
							}
							if (d == '}') chunk += '}';
						} else if (input[i + 3]) chunk += input[++i] + input[++i] + input[++i];
						else warnings.push([i, 'Incomplete escape sequence.']);
					} else if (c == 'x') chunk += input[++i] + input[++i];
					escape.appendChild(document.createTextNode(chunk));
					string.appendChild(escape);
					chunk = '';
					if (d == '\n') {
						var linenum = document.createElement('span');
						linenum.className = 'line';
						linenum.dataset.linenum = ++line;
						string.appendChild(linenum);
					}
				} else if (d == '$' && input[i + 1] == '{') {
					inTemplate++;
					enteringTemplate = true;
					break;
				} else chunk += d;
			}
			if (d && !enteringTemplate) chunk += d;
			string.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(string);
			chunk = '';
			if (d == '\n') {
				var linenum = document.createElement('span');
				linenum.className = 'line';
				linenum.dataset.linenum = ++line;
				codeBlock.appendChild(linenum);
			}
			if (enteringTemplate) {
				var punc = document.createElement('span');
				punc.className = 'template punctuation';
				punc.appendChild(document.createTextNode('${'));
				codeBlock.appendChild(punc);
				i++;
			}
		} else if (c == '/' && input[i + 1] == '/') {
			i++;
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '//';
			var comment = document.createElement('span');
			comment.className = 'inline-comment';
			while ((d = input[++i]) && d != '\n') chunk += d;
			if (d) chunk += '\n';
			comment.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(comment);
			chunk = '';
			if (d) {
				var linenum = document.createElement('span');
				linenum.className = 'line';
				linenum.dataset.linenum = ++line;
				codeBlock.appendChild(linenum);
			}
		} else if (c == '/' && input[i + 1] == '*') {
			i++;
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '/*';
			var comment = document.createElement('span');
			comment.className = 'inline-comment';
			input = input.substr(0, i) + ' ' + input.substr(i + 1);
			while ((d = input[++i]) && (d != '/' || input[i - 1] != '*')) {
				chunk += d;
				if (d == '\n') {
					comment.appendChild(document.createTextNode(chunk));
					chunk = '';
					var linenum = document.createElement('span');
					linenum.className = 'line';
					linenum.dataset.linenum = ++line;
					comment.appendChild(linenum);
				}
			}
			if (d) chunk += d;
			comment.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(comment);
			chunk = '';
			if (d == '\n') {
				var linenum = document.createElement('span');
				linenum.className = 'line';
				linenum.dataset.linenum = ++line;
				codeBlock.appendChild(linenum);
			}
		} else if (
				c == '/'
				&& (
					(
						['number', 'regex'].indexOf((codeBlock.lastElementChild || {}).className) == -1
						&& /(^\s*|[+\-=!~/*%<>&|\^(;:\[,])\s*$/.test(input.substr(0, i))
					) || (
						codeBlock.lastElementChild
						&& codeBlock.lastElementChild.firstChild
						&& codeBlock.lastElementChild.firstChild.nodeValue == 'return'
					)
				)
			) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var regex = document.createElement('span');
			regex.className = 'regex';
			var regexOpen = document.createElement('span');
			regexOpen.className = 'open';
			regexOpen.appendChild(document.createTextNode('/'));
			regex.appendChild(regexOpen);
			var d,
				charclass = false;
			while ((d = input[++i]) && d != '/') {
				if (d == '\n') {
					warnings.push([i, 'Unexpected line end with unterminated regex literal.']);
					regex.appendChild(document.createTextNode(chunk + '\n'));
					chunk = '';
					var linenum = document.createElement('span');
					linenum.className = 'line';
					linenum.dataset.linenum = ++line;
					regex.appendChild(linenum);
					break;
				}
				if (d == '\\') {
					if (charclass) charclass.appendChild(document.createTextNode(chunk));
					else regex.appendChild(document.createTextNode(chunk));
					chunk = d + (d = input[++i]);
					var escape = document.createElement('span');
					escape.className = 'escape';
					if (d == 'c') chunk += d = input[++i];
					else if (d == 'x' || d == '0') chunk += input[++i] + input[++i];
					else if (d == 'u') chunk += input[++i] + input[++i] + input[++i] + input[++i];
					else if (/\d/.test(d)) {
						while (/\d/.test(input[++i])) chunk += input[i];
						i--;
						escape.className = 'backreference';
					}
					escape.appendChild(document.createTextNode(chunk));
					chunk = '';
					if (charclass) charclass.appendChild(escape);
					else regex.appendChild(escape);
					if (d == '\n') {
						warnings.push([i, 'Unexpected line end with unterminated regex literal.']);
						break;
					}
				} else if (charclass) {
					if (d == ']') {
						charclass.appendChild(document.createTextNode(chunk));
						chunk = '';
						var end = document.createElement('span');
						end.className = 'punctuation';
						end.appendChild(document.createTextNode(']'));
						charclass.appendChild(end);
						regex.appendChild(charclass);
						charclass = false;
					} else if (input[i + 1] == '-' && input[i + 2] != ']') {
						charclass.appendChild(document.createTextNode(chunk));
						chunk = '';
						var range = document.createElement('span');
						range.className = 'range';
						range.appendChild(document.createTextNode(d + input[++i] + input[++i]));
						charclass.appendChild(range);
					} else chunk += d;
				} else {
					if (d == '^' || d == '$' || d == '|' || d == '.') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '';
						var special = document.createElement('span');
						special.className = 'special';
						special.appendChild(document.createTextNode(d));
						regex.appendChild(special);
					} else if (d == '?' || d == '+' || d == '*') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '';
						var quantifier = document.createElement('span');
						quantifier.className = 'quantifier';
						quantifier.appendChild(document.createTextNode(d));
						regex.appendChild(quantifier);
					} else if (d == '?' || d == '+' || d == '*') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '';
						var quantifier = document.createElement('span');
						quantifier.className = 'quantifier';
						quantifier.appendChild(document.createTextNode(d));
						regex.appendChild(quantifier);
					} else if (d == '(' || d == ')') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = d;
						if (d == '(' && input[i + 1] == '?' && ':=!'.indexOf(input[i + 2]) != -1) chunk += input[++i] + input[++i];
						var grouper = document.createElement('span');
						grouper.className = 'grouper';
						grouper.appendChild(document.createTextNode(chunk));
						regex.appendChild(grouper);
						chunk = '';
					} else if (d == '{') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '';
						var quantifier = document.createElement('span');
						quantifier.className = 'quantifier';
						var brace = document.createElement('span');
						brace.className = 'punctuation';
						brace.appendChild(document.createTextNode('{'));
						quantifier.appendChild(brace);
						while ((d = input[++i]) && d != '}') {
							if (d == '\n') {
								warnings.push([i, 'Unexpected line end with unterminated regex literal.']);
								quantifier.appendChild(document.createTextNode(chunk + '\n'));
								chunk = '';
								var linenum = document.createElement('span');
								linenum.className = 'line';
								linenum.dataset.linenum = ++line;
								quantifier.appendChild(linenum);
								break;
							}
							if (d == ',') {
								quantifier.appendChild(document.createTextNode(chunk));
								chunk = '';
								var comma = document.createElement('span');
								comma.className = 'punctuation';
								comma.appendChild(document.createTextNode(','));
								quantifier.appendChild(comma);
							} else chunk += d;
						}
						quantifier.appendChild(document.createTextNode(chunk));
						if (d == '}') {
							var brace = document.createElement('span');
							brace.className = 'punctuation';
							brace.appendChild(document.createTextNode('}'));
							quantifier.appendChild(brace);
						} else warnings.push([i, 'Unclosed regex quantifier.']);
						chunk = '';
						regex.appendChild(quantifier);
					} else if (d == '[') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '[';
						if (input[++i] == '^') chunk += '^';
						else i--;
						charclass = document.createElement('span');
						charclass.className = 'charclass';
						var start = document.createElement('span');
						start.className = 'punctuation';
						start.appendChild(document.createTextNode(chunk));
						charclass.appendChild(start);
						chunk = '';
					} else chunk += d;
				}
			}
			(charclass || regex).appendChild(document.createTextNode(chunk));
			if (charclass) regex.appendChild(charclass);
			chunk = '';
			if (d && d != '\n') {
				var regexClose = document.createElement('span');
				regexClose.className = 'close';
				regexClose.appendChild(document.createTextNode('/'));
				regex.appendChild(regexClose);
			} else warnings.push([i, 'Unterminated regex literal.']);
			var modifiers = input.substr(i + 1).match(/^[igm]*/);
			if (modifiers) {
				var regexModifier = document.createElement('span');
				regexModifier.className = 'modifier';
				regexModifier.appendChild(document.createTextNode(modifiers[0]));
				regex.appendChild(regexModifier);
				i += modifiers[0].length;
			}
			codeBlock.appendChild(regex);
		} else if (input.substr(i, 10) == '.prototype') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var dot = document.createElement('span');
			dot.className = 'dot';
			dot.appendChild(document.createTextNode('.'));
			codeBlock.appendChild(dot);
			var proto = document.createElement('span');
			proto.className = 'prototype';
			proto.appendChild(document.createTextNode('prototype'));
			codeBlock.appendChild(proto);
			i += 9;
		} else if ((beforeWord = (input[i - 1] || ' ').match(/[^\w.]/)) && (
				('NaN' == input.substr(i, 3) && !/\w/.test(input[i + 3] || '') && (l = 3)) ||
				('true' == input.substr(i, 4) && !/\w/.test(input[i + 4] || '') && (l = 4)) ||
				('null' == input.substr(i, 4) && !/\w/.test(input[i + 4] || '') && (l = 4)) ||
				('false' == input.substr(i, 5) && !/\w/.test(input[i + 5] || '') && (l = 5)) ||
				('Infinity' == input.substr(i, 8) && !/\w/.test(input[i + 8] || '') && (l = 8))
			)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var keyword = document.createElement('span');
			keyword.className = 'constant';
			keyword.appendChild(document.createTextNode(input.substr(i, l)));
			codeBlock.appendChild(keyword);
			i += l - 1;
		} else if (beforeWord && c != c.toLowerCase()) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = c;
			var capvar = document.createElement('span');
			capvar.className = 'capvar';
			while ((d = input[++i]) && /[\w\d]/.test(d)) chunk += d;
			i--;
			capvar.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(capvar);
			chunk = '';
		} else if (beforeWord && (
				(['do', 'if', 'in'].indexOf(input.substr(i, 2)) != -1 && !/\w/.test(input[i + 2] || '') && (l = 2)) ||
				(['for', 'get', 'let', 'new', 'try', 'var'].indexOf(input.substr(i, 3)) != -1 && !/\w/.test(input[i + 3] || '') && (l = 3)) ||
				(['case', 'else', 'this', 'void', 'with'].indexOf(input.substr(i, 4)) != -1 && !/\w/.test(input[i + 4] || '') && (l = 4)) ||
				(['break', 'class', 'catch', 'const', 'super', 'throw', 'while', 'yield'].indexOf(input.substr(i, 5)) != -1 && !/\w/.test(input[i + 5] || '') && (l = 5)) ||
				(['delete', 'export', 'import', 'return', 'static', 'switch', 'typeof'].indexOf(input.substr(i, 6)) != -1 && !/\w/.test(input[i + 6] || '') && (l = 6)) ||
				(['default', 'extends', 'finally'].indexOf(input.substr(i, 7)) != -1 && !/\w/.test(input[i + 7] || '') && (l = 7)) ||
				(['continue', 'debugger'].indexOf(input.substr(i, 8)) != -1 && !/\w/.test(input[i + 8] || '') && (l = 8)) ||
				(['instanceof'].indexOf(input.substr(i, 10)) != -1 && !/\w/.test(input[i + 10] || '') && (l = 10))
			)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var keyword = document.createElement('span');
			keyword.className = 'keyword';
			keyword.appendChild(document.createTextNode(input.substr(i, l)));
			codeBlock.appendChild(keyword);
			if (input.substr(i, l) == 'var') inVarDec.unshift({
				parens: 0,
				brackets: 0,
				braces: 0,
				equals: false
			});
			if (input.substr(i, l) == 'in') inVarDec.shift();
			i += l - 1;
		} else if (beforeWord && (
				(['enum', 'eval'].indexOf(input.substr(i, 4)) != -1 && !/\w/.test(input[i + 4] || '') && (l = 4)) ||
				(['await'].indexOf(input.substr(i, 5)) != -1 && !/\w/.test(input[i + 5] || '') && (l = 5)) ||
				(['public'].indexOf(input.substr(i, 6)) != -1 && !/\w/.test(input[i + 6] || '') && (l = 6)) ||
				(['package', 'private'].indexOf(input.substr(i, 7)) != -1 && !/\w/.test(input[i + 7] || '') && (l = 7)) ||
				(['continue', 'debugger'].indexOf(input.substr(i, 8)) != -1 && !/\w/.test(input[i + 8] || '') && (l = 8)) ||
				(['interface', 'protected'].indexOf(input.substr(i, 9)) != -1 && !/\w/.test(input[i + 9] || '') && (l = 9)) ||
				(['implements'].indexOf(input.substr(i, 10)) != -1 && !/\w/.test(input[i + 10] || '') && (l = 10))
			)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var keyword = document.createElement('span');
			keyword.className = 'keyword reserved';
			keyword.appendChild(document.createTextNode(input.substr(i, l)));
			codeBlock.appendChild(keyword);
			if (input.substr(i, l) == 'var') inVarDec.unshift({
				parens: 0,
				brackets: 0,
				braces: 0,
				equals: false
			});
			if (input.substr(i, l) == 'in') inVarDec.shift();
			i += l - 1;
		} else if (beforeWord && (
				(['top'].indexOf(input.substr(i, 3)) != -1 && !/\w/.test(input[i + 3] || '') && (l = 3)) ||
				(['self'].indexOf(input.substr(i, 4)) != -1 && !/\w/.test(input[i + 4] || '') && (l = 4)) ||
				(['fetch'].indexOf(input.substr(i, 5)) != -1 && !/\w/.test(input[i + 5] || '') && (l = 5)) ||
				(['window', 'screen', 'crypto', 'status', 'frames', 'opener', 'parent'].indexOf(input.substr(i, 6)) != -1 && !/\w/.test(input[i + 6] || '') && (l = 6)) ||
				(['console', 'history', 'menubar', 'toolbar'].indexOf(input.substr(i, 7)) != -1 && !/\w/.test(input[i + 7] || '') && (l = 7)) ||
				(['document'].indexOf(input.substr(i, 8)) != -1 && !/\w/.test(input[i + 8] || '') && (l = 8)) ||
				(['arguments', 'statusbar', 'navigator', 'indexedDB'].indexOf(input.substr(i, 9)) != -1 && !/\w/.test(input[i + 9] || '') && (l = 9)) ||
				(['scrollbars', 'styleMedia'].indexOf(input.substr(i, 10)) != -1 && !/\w/.test(input[i + 10] || '') && (l = 10)) ||
				(['locationbar', 'personalbar', 'performance'].indexOf(input.substr(i, 11)) != -1 && !/\w/.test(input[i + 11] || '') && (l = 11)) ||
				(['frameElement', 'localStorage'].indexOf(input.substr(i, 12)) != -1 && !/\w/.test(input[i + 12] || '') && (l = 12)) ||
				(['sessionStorage'].indexOf(input.substr(i, 14)) != -1 && !/\w/.test(input[i + 14] || '') && (l = 14)) ||
				(['speechSynthesis'].indexOf(input.substr(i, 15)) != -1 && !/\w/.test(input[i + 15] || '') && (l = 15)) ||
				(['devicePixelRatio', 'applicationCache'].indexOf(input.substr(i, 16)) != -1 && !/\w/.test(input[i + 16] || '') && (l = 16))
			)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var keyword = document.createElement('span');
			keyword.className = 'browser';
			keyword.appendChild(document.createTextNode(input.substr(i, l)));
			codeBlock.appendChild(keyword);
			i += l - 1;
		} else if (input.substr(i, 8) == 'function' && !/\w/.test(input[i - 1] || ' ')) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var node,
				nodeNum = codeBlock.childNodes.length,
				fnameNodes = [],
				foundEquals = false,
				foundName = false,
				endNode = false;
			prevNodes: while (node = codeBlock.childNodes[--nodeNum]) {
				if (foundEquals) {
					if (!endNode) {
						if (node.tagName) {
							endNode = node;
						} else {
							var str = node.nodeValue;
							for (var j = str.length - 1; j >= 0; j--) {
								if (/[\S]/.test(str[j])) {
									endNode = node.splitText(j + 1);
									nodeNum++;
									break;
								}
							}
						}
						continue;
					}
					if (node.tagName) {
						if (node.className == 'inline-comment' && !foundName) fnameNodes.push(node);
						else if (['capvar', 'dot', 'prototype', 'newvar', 'line'].indexOf(node.className) != -1 && node.dataset.linenum != 1) {
							fnameNodes.push(node);
							foundName = true;
						} else {
							var fname = document.createElement('span');
							fname.className = 'function-name';
							for (var j = fnameNodes.length - 1; j >= 0; j--) fname.appendChild(fnameNodes[j]);
							codeBlock.insertBefore(fname, endNode);
							break;
						}
					} else {
						var str = node.nodeValue;
						for (var j = str.length - 1; j >= 0; j--) {
							if (foundName && /[\s=(]/.test(str[j])) {
								fnameNodes.push(node.splitText(j + 1));
								var fname = document.createElement('span');
								fname.className = 'function-name';
								for (var j = fnameNodes.length - 1; j >= 0; j--) fname.appendChild(fnameNodes[j]);
								codeBlock.insertBefore(fname, endNode);
								if (endNode.tagName) fname.appendChild(endNode);
								break prevNodes;
							}
						}
						fnameNodes.push(node);
					}
				} else if (node.className == 'equals') {
					foundEquals = true;
					nodeNum++;
				} else if (/\S/.test(node.textContent)) break;
			}
			var funcKeyword = document.createElement('span');
			funcKeyword.className = 'keyword';
			funcKeyword.appendChild(document.createTextNode('function'));
			i += 7;
			while ((c = input[++i]) && /\s/.test(c)) {
				chunk += c;
				if (c == '\n') {
					funcKeyword.appendChild(document.createTextNode(chunk));
					chunk = '';
					var linenum = document.createElement('span');
					linenum.className = 'line';
					linenum.dataset.linenum = ++line;
					funcKeyword.appendChild(linenum);
				}
			}
			funcKeyword.appendChild(document.createTextNode(chunk));
			chunk = '';
			if (input[i] == '*') {
				var star = document.createElement('span');
				star.className = 'generator-star';
				star.appendChild(document.createTextNode('*'));
				funcKeyword.appendChild(star);
			} else i--;
			codeBlock.appendChild(funcKeyword);
			var fname = document.createElement('span');
			fname.className = 'function-name';
			var comment = false,
				lineComment;
			while ((c = input[++i]) && (c != '(' || comment)) {
				if (!comment && c == '/' && input[i + 1] == '*') {
					fname.appendChild(document.createTextNode(chunk));
					chunk = c + input[++i];
					comment = document.createElement('span');
					comment.className = 'inline-comment';
					lineComment = false;
				} else if (!comment && c == '/' && input[i + 1] == '/') {
					fname.appendChild(document.createTextNode(chunk));
					chunk = c + input[++i];
					comment = document.createElement('span');
					comment.className = 'inline-comment';
					lineComment = true;
				} else if (!lineComment && c == '\n') {
					(fname || comment).appendChild(document.createTextNode(chunk + '\n'));
					chunk = '';
					var linenum = document.createElement('span');
					linenum.className = 'line';
					linenum.dataset.linenum = ++line;
					(fname || comment).appendChild(linenum);
				} else if (comment && !lineComment && input.substr(i, 2) == '*/') {
					comment.appendChild(document.createTextNode(chunk + '*/'));
					chunk = '';
					fname.appendChild(comment);
					comment = false;
					i++;
				} else if (lineComment && c == '\n') {
					comment.appendChild(document.createTextNode(chunk));
					chunk = '';
					fname.appendChild(comment);
					comment = lineComment = false;
					i--;
				} else chunk += c;
			}
			fname.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(fname);
			chunk = '';
			if (input[i] != '(') {
				warnings.push([i, 'Arguments not found.']);
				i--;
			} else {
				var paren = document.createElement('span');
				paren.className = 'punctuation';
				paren.appendChild(document.createTextNode('('));
				codeBlock.appendChild(paren);
				while ((c = input[++i]) && c != ')') {
					if (c == '/') break;
					if (c == ',') {
						var arg = document.createElement('span');
						arg.className = 'argument';
						arg.appendChild(document.createTextNode(chunk));
						codeBlock.appendChild(arg);
						chunk = '';
						var comma = document.createElement('span');
						comma.className = 'punctuation';
						comma.appendChild(document.createTextNode(','));
						codeBlock.appendChild(comma);
					} else chunk += c;
				}
				var arg = document.createElement('span');
				arg.className = 'argument';
				arg.appendChild(document.createTextNode(chunk));
				codeBlock.appendChild(arg);
				chunk = '';
				if (c == '/') {
					i--;
				} else if (c) {
					var paren = document.createElement('span');
					paren.className = 'punctuation';
					paren.appendChild(document.createTextNode(')'));
					codeBlock.appendChild(paren);
				} else {
					warnings.push([i, 'Unclosed argument list.']);
					i--;
				}
			}
		} else if (c == '(') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var lastChunk = codeBlock.lastChild.nodeValue;
			if (lastChunk) {
				var call = codeBlock.lastChild.splitText(Math.max(lastChunk.lastIndexOf(' '), lastChunk.lastIndexOf('\t'), lastChunk.lastIndexOf('\n'), 0));
				var callspan = document.createElement('span');
				callspan.className = 'function-call';
				callspan.appendChild(call);
				codeBlock.appendChild(callspan);
			}
			var charspan = document.createElement('span');
			charspan.className = 'punctuation';
			charspan.appendChild(document.createTextNode('('));
			codeBlock.appendChild(charspan);
			if (inVarDec[0]) inVarDec[0].parens++;
		} else if (input.substr(i, 2) == '=>') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator';
			operator.appendChild(document.createTextNode('=>'));
			codeBlock.appendChild(operator);
			i++;
		} else if (['++', '--', '*=', '/=', '%=', '+=', '-=', '&=', '|=', '^='].indexOf(input.substr(i, 2)) != -1) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator assigns';
			operator.appendChild(document.createTextNode(input.substr(i, 2)));
			codeBlock.appendChild(operator);
			i++;
		} else if (input.substr(i, 4) == '>>>=') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator assigns';
			operator.appendChild(document.createTextNode(input.substr(i, 4)));
			codeBlock.appendChild(operator);
			i += 3;
		} else if (input.substr(i, 3) == '<<=' || input.substr(i, 3) == '>>=') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator assigns';
			operator.appendChild(document.createTextNode(input.substr(i, 3)));
			codeBlock.appendChild(operator);
			i += 2;
		}else if (input.substr(i, 3) == '===' || input.substr(i, 3) == '!==' || (input.substr(i, 3) == '>>>' && input[i + 3] != '=')) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator';
			operator.appendChild(document.createTextNode(input.substr(i, 3)));
			codeBlock.appendChild(operator);
			i += 2;
		} else if (['<=', '>=', '==', '!=', '<<', '>>', '&&', '||'].indexOf(input.substr(i, 2)) != -1 && ['=', '<', '>'].indexOf(input[i + 2]) == -1) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator';
			operator.appendChild(document.createTextNode(input.substr(i, 2)));
			codeBlock.appendChild(operator);
			i++;
		} else if ('?:+-*/%&|^!~'.indexOf(c) != -1) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator';
			operator.appendChild(document.createTextNode(c));
			codeBlock.appendChild(operator);
		}  else if (beforeWord && /\d/.test(c)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var start = i;
			if (c == '0' && input[i + 1] != '.' && (c = input[++i])) {
				if (c.toLowerCase() == 'b') {
					while ('01'.indexOf(input[++i]) != -1);
				} else if (c.toLowerCase() == 'o') {
					while ('01234567'.indexOf(input[++i]) != -1);
				} else if (c.toLowerCase() == 'x') {
					while ('0123456789abcdefABCDEF'.indexOf(input[++i]) != -1);
				} else if (/[\d\w]/.test(c)) warnings.push([i, 'Bad number literal.']);
				var num = document.createElement('span');
				num.className = 'number';
				num.appendChild(document.createTextNode(input.substring(start, i--)));
				codeBlock.appendChild(num);
			} else {
				while ('0123456789.'.indexOf(input[i]) != -1) i++;
				if ((input[i] || '').toLowerCase() == 'e') {
					if ('+-'.indexOf(input[i])) i++;
					if ('0123456789'.indexOf(input[i]) == -1) warnings.push([i, 'No exponent found after "e".']);
					else i++;
					while ('0123456789.'.indexOf(input[i]) != -1) i++;
				}
				var num = document.createElement('span');
				num.className = 'number';
				num.appendChild(document.createTextNode(input.substring(start, i)));
				codeBlock.appendChild(num);
				i--;
			}
		} else if ('=.,;)[]{}'.indexOf(c) != -1) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var charspan = document.createElement('span');
			charspan.className = ({'=': 'equals', '.': 'dot'})[c] || 'punctuation';
			charspan.appendChild(document.createTextNode(c));
			codeBlock.appendChild(charspan);
			if (inVarDec[0]) {
				if (Math.max(inVarDec[0].parens, inVarDec[0].brackets, inVarDec[0].braces) == 0) {
					if (c == '=') inVarDec[0].equals = true;
					if (c == ',') inVarDec[0].equals = false;
				}
				if (c == ')') {
					inVarDec[0].parens--;
					if (inVarDec[0].parens < 0) {
						warnings.push([i, 'Unexpected close paren, make sure you use a semicolon after a variable declaration.']);
						inVarDec.shift();
					}
				}
				if (c == '[') inVarDec[0].brackets++;
				if (c == ']') {
					inVarDec[0].brackets--;
					if (inVarDec[0].brackets < 0) {
						warnings.push([i, 'Unexpected close bracket, make sure you use a semicolon after a variable declaration.']);
						inVarDec.shift();
					}
				}
				if (c == '{') inVarDec[0].braces++;
				if (c == '}') {
					inVarDec[0].braces--;
					if (inVarDec[0].braces < 0) {
						warnings.push([i, 'Unexpected close brace, make sure you use a semicolon after a variable declaration.']);
						inVarDec.shift();
					}
				}
				if (c == ';') inVarDec.shift();
			}
		} else if (c == '\n') {
			codeBlock.appendChild(document.createTextNode(chunk + '\n'));
			chunk = '';
			var linenum = document.createElement('span');
			linenum.className = 'line';
			linenum.dataset.linenum = ++line;
			codeBlock.appendChild(linenum);
		} else if (/\S/.test(c) && inVarDec[0] && !inVarDec[0].equals && Math.max(inVarDec[0].parens, inVarDec[0].brackets, inVarDec[0].braces) == 0) {
			var newvar;
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			if (codeBlock.lastChild.className == 'newvar') newvar = codeBlock.lastChild;
			else {
				newvar = document.createElement('span');
				newvar.className = 'newvar';
			}
			newvar.appendChild(document.createTextNode(c));
			codeBlock.appendChild(newvar);
		} else chunk += c;
	}
	codeBlock.appendChild(document.createTextNode(chunk + '\xa0'));
	codeBlock.dataset.line = Math.floor(Math.log10(line));
	var lines = input.split('\n');
	for (var i = 0; i < warnings.length; i++) {
		var line = input.substr(0, warnings[i][0]).split('\n').length - 1,
			lineEl = codeBlock.getElementsByClassName('line')[line];
		lineEl.classList.add('warning');
		if (lineEl.title) lineEl.title += '\n';
		lineEl.title += 'Column ' + (warnings[i][0] - lines.slice(0, line).join('\n').length) + ': ' + warnings[i][1];
	}
}