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

function html(input, attribute) {
	if (attribute) return input.toString().replaceAll(['&', '<', '"', '\t', '\n', '\b'], ['&amp;', '&lt;', '&quot;', '&#9;', '&#10;', '']);
	return input.toString().replaceAll(['&', '<', '\b'], ['&amp;', '&lt;', '']);
}

var mdWarnings = [];
function warning(message) {
	console.log(message);
	mdWarnings.push(message);
}
function spanMarkdown(input) {
	input = html(input);
	while (input.match(/\^([\w\^]+)/)) input = input.replace(/\^([\w\^]+)/, '<sup>$1</sup>');
	return input
		.replaceAll('\u0001', '^')
		.replace(/\[(.+?)\|(.+?)\]/g, '<abbr title="$2">$1</abbr>')
		.replaceAll('\u0002', '[')
		.replace(/\[\[(\d+)\](.*?)\]/g, '<sup class="reference" title="$2">[$1]</sup>')
		.replace(/\[\[ !\[([^\[\]]+?)]\(https?:\/\/([^\s("\\]+?\.[^\s"\\]+?)\) \]\]/g, '<img alt="$1" class="center" src="https://$2" />')
		.replace(/!\[([^\[\]]+?)]\(https?:\/\/([^\s("\\]+?\.[^\s"\\]+?)\)/g, '<img alt="$1" src="https://$2" />')
		.replace(/\[([^\[\]]+)]\((https?:\/\/[^\s()"\[\]]+?\.[^\s"\\\[\]]+?)\)/g, '$1'.link('$2'))
		.replace(/(\s|^)https?:\/\/([^\s()"]+?\.[^\s"]+?\.(svg|png|tiff|jpg|jpeg)(\?[^\s"\/]*)?)/g, '$1<img src="https://$2" />')
		.replace(/(\s|^)(https?:\/\/([^\s()"]+?\.[^\s"()]+))/g, '$1' + '$3'.link('$2'))
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
		code = '',
		i;
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
			if (arr[i + 1] && arr[i + 1].match(/^(\d+|[A-z])[.)] /)) {
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
			} else if (ol && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    ' && !arr[i + 1].match(/^(\d+|[A-z])[.)] /)))) {
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
			} else if (ol && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    ' && !arr[i + 1].match(/^((\d+|[A-z])|[A-z])[.)] /)))) {
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
		} else if (val.match(/^[-–—]{12,}$/)) {
			return '<hr />';
		} else if (i = val.match(/^cite\[(\d+)\]: /)) {
			return '<div><sup class="reference-list">' + i[1] + '</sup> ' + inlineMarkdown(val.substr(i[0].length)) + '</div>';
		} else return '<p>' + inlineMarkdown(val) + '</p>';
	}).join('');
}

HTMLTextAreaElement.prototype.mdValidate = function(correct) {
	var i = mdWarnings.length;
	markdown(this.value);
	var preverr = this.previousElementSibling && this.previousElementSibling.classList.contains('md-err') ? this.previousElementSibling : null,
		err = mdWarnings[i];
	this.lastErrored = err && correct;
	if (err && (correct || preverr || this.value.substr(0, this.selectionEnd || Infinity).match(/\s$/))) {
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
};

function mdValidateBody() {
	if (document.activeElement.mdValidate && document.activeElement.spellcheck) document.activeElement.mdValidate();
};
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

var noPageOverflow = noPageOverflow || false,
	pageOverflowMobile = pageOverflowMobile || false,
	footerOff = footerOff || false,
	mainContentEl = mainContentEl || false,
	mainBottomPad = mainBottomPad || 0;

function minHeight() {
	var footer = document.getElementById('footer').offsetHeight,
		sidebar = document.getElementById('sidebar');
	if (innerWidth < 1500 && sidebar) footer += sidebar.offsetHeight + 6;
	if (noPageOverflow && !(innerWidth < pageOverflowMobile)) {
		mainContentEl.style.minHeight = '';
		mainContentEl.style.height = Math.max(innerHeight - (footerOff ? -4 : footer) - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - 6, noPageOverflow) - mainBottomPad + 'px';
		if (sidebar) sidebar.style.height = '';
	} else {
		mainContentEl.style.height = '';
		if (navigator.userAgent.indexOf('Mobile') == -1) mainContentEl.style.minHeight = Math.max(0, innerHeight - (footerOff ? -4 : footer) - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - 6 - mainBottomPad) + 'px';
		else mainContentEl.style.minHeight = '';
		if (sidebar) {
			if (innerWidth >= 1500) sidebar.style.height = mainContentEl.offsetHeight + 'px';
			else sidebar.style.height = '';
		}
	}
}
addEventListener('load', minHeight);
addEventListener('resize', minHeight);
addEventListener('resize', function() {
	requestAnimationFrame(minHeight);
});

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
		console.log(this.hist, this.hIndex);
		if (data) {
			this.value = data.body;
			this.selectionStart = data.start;
			this.selectionEnd = data.end;
		} else e.shiftKey ? --this.hIndex : ++this.hIndex
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
		}, this.lastKeyCode == e.keyCode || [8, 9, 13].indexOf(e.keyCode) == -1 ? 400 : 0, this);
	}
	this.lastKeyCode = e.keyCode;
}

addEventListener('DOMContentLoaded', function() {
	mainContentEl = mainContentEl || document.getElementById('content');
	if (navigator.userAgent.indexOf('Trident') != -1 || navigator.userAgent.indexOf('MSIE') != -1) {
		var span = document.createElement('span');
		span.appendChild(document.createTextNode('This site does not support Microsoft Internet Explorer due to its lack of compatibility with web specifications.'));
		document.getElementById('err').appendChild(span);
		document.getElementById('cont').hidden = true;
		document.getElementById('cont').style.display = 'none';
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
	setInterval(function() {
		var times = document.getElementsByTagName('time');
		for (var i = 0; i < times.length; i++) {
			var t = ago(Date.parse(times[i].getAttribute('datetime')));
			if (times[i].textContent != t) times[i].textContent = t;
		}
	}, 100);
	e = document.getElementsByClassName('html-program');
	i = e.length;
	while (i--) {
		var outputBlob = new Blob([
			'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><body>' + e[i].dataset.html + '<style>html{zoom:0.5}' + html(e[i].dataset.css) + '</style><script>alert=prompt=confirm=null;' + html(e[i].dataset.js) + '</script></body></html>'
		], {type: 'application/xhtml+xml'});
		e[i].src = URL.createObjectURL(outputBlob);
	}
	e = document.getElementsByTagName('link');
	for (i = 0; i < e.length; i++ ) {
		if (e[i].getAttribute('href') == '/a/clean.css') footerOff = true;
	}
	e = document.getElementsByClassName('canvas-program');
	i = e.length;
	if (i) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', '/dev/canvas.js', true);
		xhr.send();
		xhr.onload = function() {
			while (i--) {
				var outputBlob = new Blob([
					'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Output frame</title></head><style>*{margin:0;max-width:100%;box-sizing:border-box}body{background:#000;color:#fff}#canvas{-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;overflow:auto;margin-top:8px}button,canvas{display:block}button{margin-top:6px}</style><body><canvas id="canvas"></canvas><div id="console"></div><button onclick="location.reload()">Restart</button><script>\'use strict\';' + html(this.responseText) + 'try{this.eval(' + html(JSON.stringify(e[i].dataset.code)) + ')}catch(e){error(e)}</script></body></html>'
				], {type: 'application/xhtml+xml'});
				e[i].src = URL.createObjectURL(outputBlob);
			}
		};
	}
	minHeight();
});

document.addEventListener('visibilitychange', function() {
	if (!document.hidden && document.querySelector('#nav > a:nth-child(8)').firstChild.nodeValue != 'Log in') {
		request('/api/notif', function(res) {
			document.getElementById('nav').children[7].classList.toggle('unread', res);
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
		var cut = this.value.substr(0, oldSelectionStart).match(/[\n^]\s+$/) ? 0 : (this.value.substr(0, oldSelectionStart).match(/[\t ]+$/) || '').length;
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
	} else if (this.id != 'css' && e.keyCode == 61 && this.value.substr(0, this.selectionStart).match(/(draw|refresh) $/)) {
		var tabs = this.value.substr(0, oldSelectionStart).split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1].split('\t').length;
		this.value = this.value.substr(0, this.selectionStart) + '= function() {\n' + '\t'.repeat(tabs) + '\n' + '\t'.repeat(tabs - 1) + '}' + this.value.substr(this.selectionEnd);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 15 + tabs;
		e.preventDefault();
	} else if (this.id != 'css' && e.keyCode == 116 && this.value.substr(0, this.selectionStart).match(/func$/)) {
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

function highlightHTML(codeBlock, input) {
	var input = typeof(input) == 'string' ? input : codeBlock.textContent,
		chunk = '',
		warnings = [],
		line = 1,
		fc;
	while (fc = codeBlock.firstChild) codeBlock.removeChild(fc);
	var linenum = document.createElement('span');
	linenum.className = 'line';
	linenum.dataset.linenum = line;
	codeBlock.appendChild(linenum);
	for (var i = 0; i < input.length; i++) {
		var c = input[i];
		if (c == '\n') {
			codeBlock.appendChild(document.createTextNode(chunk + '\n'));
			chunk = '';
			var linenum = document.createElement('span');
			linenum.className = 'line';
			linenum.dataset.linenum = ++line;
			codeBlock.appendChild(linenum);
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

function highlightCSS(codeBlock, input) {
	var input = typeof(input) == 'string' ? input : codeBlock.textContent,
		chunk = '',
		warnings = [],
		line = 1,
		fc;
	while (fc = codeBlock.firstChild) codeBlock.removeChild(fc);
	var linenum = document.createElement('span');
	linenum.className = 'line';
	linenum.dataset.linenum = line;
	codeBlock.appendChild(linenum);
	for (var i = 0; i < input.length; i++) {
		var c = input[i];
		if (c == '\n') {
			codeBlock.appendChild(document.createTextNode(chunk + '\n'));
			chunk = '';
			var linenum = document.createElement('span');
			linenum.className = 'line';
			linenum.dataset.linenum = ++line;
			codeBlock.appendChild(linenum);
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

function highlightJS(codeBlock, input) {
	var input = typeof(input) == 'string' ? input : codeBlock.textContent,
		chunk = '',
		warnings = [],
		beforeWord,
		line = 1,
		inVarDec = [],
		d,
		fc;
	while (fc = codeBlock.firstChild) codeBlock.removeChild(fc);
	var linenum = document.createElement('span');
	linenum.className = 'line';
	linenum.dataset.linenum = line;
	codeBlock.appendChild(linenum);
	for (var i = 0; i < input.length; i++) {
		var c = input[i],
			l;
		if (c == '"' || c == "'" || c == '`') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = c;
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
				} else chunk += d;
			}
			if (d) chunk += d;
			string.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(string);
			chunk = '';
			if (d == '\n') {
				var linenum = document.createElement('span');
				linenum.className = 'line';
				linenum.dataset.linenum = ++line;
				codeBlock.appendChild(linenum);
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
						&& input.substr(0, i).match(/(^\s*|[+\-=!~/*%<>&|\^(;:\[,])\s*$/)
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
					else if (d.match(/\d/)) {
						while (input[++i].match(/\d/)) chunk += input[i];
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
			regex.appendChild(document.createTextNode(chunk));
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
				('NaN' == input.substr(i, 3) && !(input[i + 3] || '').match(/\w/) && (l = 3)) ||
				('true' == input.substr(i, 4) && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				('null' == input.substr(i, 4) && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				('false' == input.substr(i, 5) && !(input[i + 5] || '').match(/\w/) && (l = 5)) ||
				('Infinity' == input.substr(i, 8) && !(input[i + 8] || '').match(/\w/) && (l = 8))
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
			while ((d = input[++i]) && d.match(/[\w\d]/)) chunk += d;
			i--;
			capvar.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(capvar);
			chunk = '';
		} else if (beforeWord && (
				(['do', 'if', 'in'].indexOf(input.substr(i, 2)) != -1 && !(input[i + 2] || '').match(/\w/) && (l = 2)) ||
				(['for', 'get', 'let', 'new', 'try', 'var'].indexOf(input.substr(i, 3)) != -1 && !(input[i + 3] || '').match(/\w/) && (l = 3)) ||
				(['case', 'else', 'this', 'void', 'with'].indexOf(input.substr(i, 4)) != -1 && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				(['break', 'class', 'catch', 'const', 'super', 'throw', 'while', 'yield'].indexOf(input.substr(i, 5)) != -1 && !(input[i + 5] || '').match(/\w/) && (l = 5)) ||
				(['delete', 'export', 'import', 'return', 'static', 'switch', 'typeof'].indexOf(input.substr(i, 6)) != -1 && !(input[i + 6] || '').match(/\w/) && (l = 6)) ||
				(['default', 'extends', 'finally'].indexOf(input.substr(i, 7)) != -1 && !(input[i + 7] || '').match(/\w/) && (l = 7)) ||
				(['continue', 'debugger'].indexOf(input.substr(i, 8)) != -1 && !(input[i + 8] || '').match(/\w/) && (l = 8)) ||
				(['instanceof'].indexOf(input.substr(i, 10)) != -1 && !(input[i + 10] || '').match(/\w/) && (l = 10))
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
				(['enum', 'eval'].indexOf(input.substr(i, 4)) != -1 && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				(['await'].indexOf(input.substr(i, 5)) != -1 && !(input[i + 5] || '').match(/\w/) && (l = 5)) ||
				(['public'].indexOf(input.substr(i, 6)) != -1 && !(input[i + 6] || '').match(/\w/) && (l = 6)) ||
				(['package', 'private'].indexOf(input.substr(i, 7)) != -1 && !(input[i + 7] || '').match(/\w/) && (l = 7)) ||
				(['continue', 'debugger'].indexOf(input.substr(i, 8)) != -1 && !(input[i + 8] || '').match(/\w/) && (l = 8)) ||
				(['interface', 'protected'].indexOf(input.substr(i, 9)) != -1 && !(input[i + 9] || '').match(/\w/) && (l = 9)) ||
				(['implements'].indexOf(input.substr(i, 10)) != -1 && !(input[i + 10] || '').match(/\w/) && (l = 10))
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
				(['top'].indexOf(input.substr(i, 3)) != -1 && !(input[i + 3] || '').match(/\w/) && (l = 3)) ||
				(['self'].indexOf(input.substr(i, 4)) != -1 && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				(['fetch'].indexOf(input.substr(i, 5)) != -1 && !(input[i + 5] || '').match(/\w/) && (l = 5)) ||
				(['window', 'screen', 'crypto', 'status', 'frames', 'opener', 'parent'].indexOf(input.substr(i, 6)) != -1 && !(input[i + 6] || '').match(/\w/) && (l = 6)) ||
				(['console', 'history', 'menubar', 'toolbar'].indexOf(input.substr(i, 7)) != -1 && !(input[i + 7] || '').match(/\w/) && (l = 7)) ||
				(['document'].indexOf(input.substr(i, 8)) != -1 && !(input[i + 8] || '').match(/\w/) && (l = 8)) ||
				(['arguments', 'statusbar', 'navigator', 'indexedDB'].indexOf(input.substr(i, 9)) != -1 && !(input[i + 9] || '').match(/\w/) && (l = 9)) ||
				(['scrollbars', 'styleMedia'].indexOf(input.substr(i, 10)) != -1 && !(input[i + 10] || '').match(/\w/) && (l = 10)) ||
				(['locationbar', 'personalbar', 'performance'].indexOf(input.substr(i, 11)) != -1 && !(input[i + 11] || '').match(/\w/) && (l = 11)) ||
				(['frameElement', 'localStorage'].indexOf(input.substr(i, 12)) != -1 && !(input[i + 12] || '').match(/\w/) && (l = 12)) ||
				(['sessionStorage'].indexOf(input.substr(i, 14)) != -1 && !(input[i + 14] || '').match(/\w/) && (l = 14)) ||
				(['speechSynthesis'].indexOf(input.substr(i, 15)) != -1 && !(input[i + 15] || '').match(/\w/) && (l = 15)) ||
				(['devicePixelRatio', 'applicationCache'].indexOf(input.substr(i, 16)) != -1 && !(input[i + 16] || '').match(/\w/) && (l = 16))
			)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var keyword = document.createElement('span');
			keyword.className = 'browser';
			keyword.appendChild(document.createTextNode(input.substr(i, l)));
			codeBlock.appendChild(keyword);
			i += l - 1;
		} else if (input.substr(i, 8) == 'function' && !(input[i - 1] || ' ').match(/\w/)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var node,
				nodeNum = codeBlock.childNodes.length,
				fnameNodes = [],
				foundEquals = false,
				endNode = false;
			prevNodes: while (node = codeBlock.childNodes[--nodeNum]) {
				if (node.className == 'equals') {
					foundEquals = true;
				} else if (foundEquals) {
					if (!endNode) {
						if (node.tagName) {
							endNode = node;
						} else {
							var str = node.nodeValue;
							for (var j = str.length - 1; j >= 0; j--) {
								if (str[j].match(/[\S]/)) {
									endNode = node.splitText(j + 1);
									nodeNum++;
									break;
								}
							}
						}
						continue;
					}
					if (node.tagName) {
						if (node.className == 'inline-comment') continue;
						if (['capvar', 'dot', 'prototype', 'newvar', 'line'].indexOf(node.className) != -1 && node.dataset.linenum != 1) fnameNodes.push(node);
						else {
							var fname = document.createElement('span');
							fname.className = 'function-name';
							for (var j = fnameNodes.length - 1; j >= 0; j--) fname.appendChild(fnameNodes[j]);
							codeBlock.insertBefore(fname, endNode);
							break;
						}
					} else {
						var str = node.nodeValue;
						for (var j = str.length - 1; j >= 0; j--) {
							if (str[j].match(/[\s=(]/)) {
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
				} else if (node.textContent.match(/\S/)) break;
			}
			var funcKeyword = document.createElement('span');
			funcKeyword.className = 'keyword';
			funcKeyword.appendChild(document.createTextNode('function'));
			i += 7;
			while ((c = input[++i]) && c.match(/\s/)) {
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
			while ((c = input[++i]) && c != '(') {
				chunk += c;
				if (c == '\n') {
					fname.appendChild(document.createTextNode(chunk));
					chunk = '';
					var linenum = document.createElement('span');
					linenum.className = 'line';
					linenum.dataset.linenum = ++line;
					fname.appendChild(linenum);
				}
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
				if (c) {
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
		}else if (input.substr(i, 3) == '===' || input.substr(i, 3) == '!==' || (input.substr(i, 3) == '>>>' && input.charAt(i + 3) != '=')) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator';
			operator.appendChild(document.createTextNode(input.substr(i, 3)));
			codeBlock.appendChild(operator);
			i += 2;
		} else if (['<=', '>=', '==', '!=', '<<', '>>', '&&', '||'].indexOf(input.substr(i, 2)) != -1 && ['=', '<', '>'].indexOf(input.charAt(i + 2)) == -1) {
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
		}  else if (beforeWord && c.match(/\d/)) {
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
				} else if (c.match(/[\d\w]/)) warnings.push([i, 'Bad number literal.']);
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
		} else if (c.match(/\S/) && inVarDec[0] && !inVarDec[0].equals && Math.max(inVarDec[0].parens, inVarDec[0].brackets, inVarDec[0].braces) == 0) {
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