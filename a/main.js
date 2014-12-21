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
HTMLCollection.prototype.indexOf = NodeList.prototype.indexOf = Array.prototype.indexOf;

function html(input, replaceQuoteOff) {
	if (replaceQuoteOff) return input.toString().replaceAll(['&', '<'], ['&amp;', '&lt;']);
	return input.toString().replaceAll(['&', '<', '"'], ['&amp;', '&lt;', '&quot;']);
}
function markdownEscape(input) {
	return input.replaceAll(['\\', '`', '*', '_', '-', '+', '.', '#', '>', '(', ')', '^', '$'], ['\u0001', '\u0002', '\u0003', '\u0004', '\u0005', '\u0006', '\u000e', '\u000f', '\u0010', '\u0011', '\u0012', '\u0013', '\u0014']);
}
function inlineMarkdown(input) {
	var backslash = '\u0001';
	input = input.replaceAll('\\\\', backslash);
	var graveaccent = '\u0002';
	input = input.replaceAll('\\`', graveaccent);
	var asterisk = '\u0003';
	input = input.replaceAll('\\*', asterisk);
	var underscore = '\u0004';
	input = input.replaceAll('\\_', underscore);
	var dash = '\u0005';
	input = input.replaceAll('\\-', dash);
	var plus = '\u0006';
	input = input.replaceAll('\\+', plus);
	var dot = '\u000e';
	input = input.replaceAll('\\.', dot);
	var hash = '\u000f';
	input = input.replaceAll('\\#', hash);
	var gt = '\u0010';
	input = input.replaceAll('\\>', gt);
	var paren = '\u0011';
	input = input.replaceAll('\\(', paren);
	var cparen = '\u0012';
	input = input.replaceAll('\\)', cparen);
	var carrot = '\u0013';
	input = input.replaceAll('\\^', carrot);
	var dollar = '\u0014';
	input = input.replaceAll('\\$', dollar);
	var open = [];
	return input.split('`').map(function(val, i, arr) {
		if (i % 2) return '<code>' + html(val.replaceAll([backslash, graveaccent, asterisk, underscore, dash, plus, dot, hash, gt, paren, cparen, carrot, dollar], ['\\\\', '\\`', '\\*', '\\_', '\\-', '\\+', '\\.', '\\#', '\\>', '\\(', '\\)', '\\^'])) + '</code>';
		var parsed = val
			.replace(/!\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, function(match, p1, p2) {
				return '![' + markdownEscape(p1) + '](' + markdownEscape(p2) + ')';
			})
			.replace(/\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, function(match, p1, p2) {
				return '[' + markdownEscape(p1) + '](' + markdownEscape(p2) + ')';
			})
			.replace(/([^;["\\])(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, function(match, p1, p2) {
				return markdownEscape(p1) + markdownEscape(p2);
			})
			.replace(/^(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, function(match, p1) {
				return markdownEscape(p1);
			})
			.replaceAll('**', '_')
		.split('*').map(function(val, i, arr) {
			var parsed = val.split('_').map(function(val, i, arr) {
				var parsed = val.split('---').map(function(val, i, arr) {
					var parsed = val.split('+++').map(function(val, i, arr) {
						var parsed = html(val.replaceAll([backslash, graveaccent, asterisk, underscore, dash, plus, dot, hash, gt], ['\\', '`', '*', '_', '-', '+', '.', '#', '>']), true)
							.replace(/!\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, '<img alt="$1" src="$2" />')
							.replace(/^(https?:\/\/([^\s("\\]+\.[^\s"\\]+\.(svg|png|tiff|jpg|jpeg)(\?[^\s"\\\/]*)?))/, '<img src="$1" />')
							.replace(/([^;["\\])(https?:\/\/([^\s("\\]+\.[^\s"\\]+\.(svg|png|tiff|jpg|jpeg)(\?[^\s"\\\/]*)?))/, '$1<img src="$2" />')
							.replace(/\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, '$1'.link('$2'))
							.replace(/([^;["\\])(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, '$1' + '$3'.link('$2'))
							.replace(/^(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, '$2'.link('$1'))
							.replace(/\^(\w+)/g, '<sup>$1</sup>');
						if (i % 2) {
							var p = open.indexOf('</ins>');
							if (p != -1) {
								open.splice(p, 1);
								return '</ins>' + parsed;
							} else if (arr[i + 1] === undefined) {
								open.push('</ins>');
								return '<ins>' + parsed;
							}
						}
						return i % 2 ? '<ins>' + parsed + '</ins>' : parsed;
					}).join('');
					if (i % 2) {
						var p = open.indexOf('</del>');
						if (p != -1) {
							open.splice(p, 1);
							return '</del>' + parsed;
						} else if (arr[i + 1] === undefined) {
							open.push('</del>');
							return '<del>' + parsed;
						}
					}
					return i % 2 ? '<del>' + parsed + '</del>' : parsed;
				}).join('');
				if (i % 2) {
					var p = open.indexOf('</strong>');
					if (p != -1) {
						open.splice(p, 1);
						return '</strong>' + parsed;
					} else if (arr[i + 1] === undefined) {
						open.push('</strong>');
						return '<strong>' + parsed;
					}
				}
				return i % 2 ? '<strong>' + parsed + '</strong>' : parsed;
			}).join('');
			if (i % 2) {
				var p = open.indexOf('</em>');
				if (p != -1) {
					open.splice(p, 1);
					return '</em>' + parsed;
				} else if (arr[i + 1] === undefined) {
					open.push('</em>');
					return '<em>' + parsed;
				}
			}
			return i % 2 ? '<em>' + parsed + '</em>' : parsed;
		}).join('');
		return parsed.replace(/\^\(([^)]+)\)/g, '<sup>$1</sup>').replace(/\$\(([^)]+)\)/g, '<sub>$1</sub>').replaceAll([paren, cparen, carrot, dollar], ['(', ')', '^', '$']);
	}).join('') + open.join('');
}
function markdown(input) {
	if (input.indexOf('\n') == -1 && input.substr(0, 2) != '> ' && input.substr(0, 2) != '- ' && input.substr(0, 2) != '* ' && input.substr(0, 4) != '    ' && input[0] != '\t' && !input.match(/^((\d+|[A-z])[.)]|#{1,6}) /)) return inlineMarkdown(input);
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
		} else if (val.substr(0, 2) == '- ' || val.substr(0, 2) == '* ') {
			if (!ul) ul = '<ul>';
			val = val.substr(2);
			if (li) {
				ul += '<li>' + markdown(li) + '</li>';
				li = '';
			};
			if (arr[i + 1] && (arr[i + 1].substr(0, 2) == '- ' || arr[i + 1] && arr[i + 1].substr(0, 2) == '* ')) {
				ul += '<li>' + inlineMarkdown(val) + '</li>';
				return '';
			} else if (arr[i + 1] && (arr[i + 1][0] == '\t' || arr[i + 1] && arr[i + 1].substr(0, 4) == '    ')) {
				li += val + '\n';
				return '';
			} else {
				var arg = ul + '<li>' + markdown(val) + '</li>';
				ul = '';
				return arg + '</ul>';
			}
		} else if (f = val.match(/^(\d+|[A-z])[.)] /)) {
			if (!ol) ol = '<ol>';
			val = val.substr(f[0].length);
			if (li) {
				ol += '<li>' + markdown(li) + '</li>';
				li = '';
			};
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
		} else return '<p>' + inlineMarkdown(val) + '</p>';
	}).join('');
}

var noPageOverflow = false,
	pageOverflowMobile = false,
	footerOff = false,
	mainContentEl,
	mainBottomPad = 0;

function minHeight() {
	var footer = document.getElementById('footer').offsetHeight,
		sidebar = document.getElementById('sidebar');
	if (innerWidth < 1500 && sidebar) footer += sidebar.offsetHeight + 6;
	if (noPageOverflow && !(pageOverflowMobile && innerWidth < 800)) {
		mainContentEl.style.minHeight = '';
		mainContentEl.style.height = Math.max(innerHeight - (footerOff ? -4 : footer) - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - 12, noPageOverflow) - mainBottomPad + 'px';
		if (sidebar) sidebar.style.height = '';
	} else {
		mainContentEl.style.height = '';
		if (innerWidth >= 800) mainContentEl.style.minHeight = innerHeight - footer - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12) - mainBottomPad + 'px';
		else mainContentEl.style.minHeight = '';
		if (sidebar) {
			if (innerWidth >= 1500) sidebar.style.height = mainContentEl.style.minHeight;
			else sidebar.style.height = '';
			if (mainContentEl.style.minHeight != innerHeight - footer - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12) - mainBottomPad + 'px') minHeight();
		}
	}
}
addEventListener('load', minHeight);
addEventListener('resize', minHeight);

function request(uri, callback, params) {
	var i = new XMLHttpRequest();
	i.open('POST', uri, true);
	i.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	i.send(params);
	i.onload = function() {
		callback(this.status == 200 ? this.responseText : 'Error: HTTP ' + this.status + ' ' + this.statusText);
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
		return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec' ][d.getUTCMonth()] + ' ' + d.getUTCDate() + ' \'' + d.getUTCFullYear().toString().substr(2);
	}
}
function agot(d) {
	var time = document.createElement('time');
	time.textContent = ago(d);
	time.setAttribute('datetime', new Date(d).toISOString());
	return time;
}

function textareaHandler(e) {
	if (this.noHandle) return delete this.nHandle;
	if (!this.hist) this.hist = [{
		body: '',
		start: 0,
		end: 0
	}];
	if (!this.hIndex) this.hIndex = 0;
	if (e.keyCode == 9) {
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
	while (i--) e[i].addEventListener('keydown', textareaHandler);
	setInterval(function() {
		var times = document.getElementsByTagName('time');
		for (var i = 0; i < times.length; i++) {
			var t = ago(Date.parse(times[i].getAttribute('datetime')));
			if (times[i].textContent != t) times[i].textContent = t;
		}
	}, 100);
	minHeight();
});

if (navigator.userAgent.indexOf('Mobile') != -1) addEventListener('touchend', function() {}); //Fixes mobile-safari bug with touch listeners in iframes not firing