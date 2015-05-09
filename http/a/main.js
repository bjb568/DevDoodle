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
HTMLCollection.prototype.forEach = NodeList.prototype.forEach = Array.prototype.forEach;
HTMLElement.prototype.insertAfter = function(newEl, refEl) {
	if (refEl.nextSibling) refEl.parentNode.insertBefore(newEl, refEl.nextSibling);
	else refEl.parentNode.appendChild(newEl);
};

function html(input, replaceQuoteOff) {
	if (replaceQuoteOff) return input.toString().replaceAll(['&', '<'], ['&amp;', '&lt;']);
	return input.toString().replaceAll(['&', '<', '"'], ['&amp;', '&lt;', '&quot;']);
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
		.replace(/!\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, '<img alt="$1" src="$2" />')
		.replace(/^(https?:\/\/([^\s("\\]+\.[^\s"\\]+\.(svg|png|tiff|jpg|jpeg)(\?[^\s"\\\/]*)?))/g, '<img src="$1" />')
		.replace(/\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, '$1'.link('$2'))
		.replace(/([^;["\\])(https?:\/\/([^\s("\\]+\.[^\s"\\]+\.(svg|png|tiff|jpg|jpeg)(\?[^\s"\\\/]*)?))/g, '$1<img src="$2" />')
		.replace(/([^;["\\])(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, '$1' + '$3'.link('$2'))
		.replace(/^(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, '$2'.link('$1'));
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
							current.push(stags[j].end);
							i += l - 1;
							continue outer;
						} else if (stags[j].end == input.substr(i, l)) {
							if (current[current.length - 1] == stags[j].end) {
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
	if (input.indexOf('\n') == -1 && input.substr(0, 2) != '> ' && input.substr(0, 3) != '>! ' && input.substr(0, 2) != '- ' && input.substr(0, 2) != '* ' && input.substr(0, 4) != '    ' && input[0] != '\t' && !input.match(/^((\d+|[A-z])[.)]|#{1,6}|cite\[\d+\]:) /) && !input.match(/^[-–—]{12,}$/)) return inlineMarkdown(input);
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
	var preverr = this.previousSibling && this.previousSibling.classList.contains('md-err') ? this.previousSibling : null,
		err = mdWarnings[i];
	this.lastErrored = err && correct;
	if (err && (correct || preverr || this.value.substr(0, this.selectionEnd || Infinity).match(/\s$/))) {
		if (preverr) {
			if (preverr.firstChild.nodeValue == err) {
				if (this.lastErrored && err && correct) {
					var input = this.value,
						output = '',
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
							if (input[i] == '\\') span += input[++i];
							else {
								for (var l = 4; l >= 0; l--) {
									if (tags[input.substr(i, l)]) {
										output += span;
										span = '';
										if (['code', 'samp'].indexOf(tags[input.substr(i, l)]) == -1) output += '\\' + input.substr(i, l);
										else if (current[current.length - 1] == tags[input.substr(i, l)]) {
											current.pop();
											output += '\\' + input.substr(i, l);
										} else {
											output += '\\' + input.substr(i, l);
											current.push(tags[input.substr(i, l)]);
										}
										i += l - 1;
										continue outer;
									}
								}
								for (var j in stags) {
									for (var l = 5; l >= 0; l--) {
										if (stags[j].start == input.substr(i, l)) {
											output += span + '\\' + input.substr(i, l);
											span = '';
											i += l - 1;
											continue outer;
										} else if (stags[j].end == input.substr(i, l)) {
											if (current[current.length - 1] == stags[j].end) {
												output += span + '\\' + input.substr(i, l);
												span = '';
												i += l - 1;
												continue outer;
											}
										}
									}
								}
								span += input[i];
							}
						} else if (current[current.length - 1] == 'code' && input[i] == '`') {
							current.pop();
							output += '`';
						} else if (current[current.length - 1] == 'samp' && input.substr(i, 2) == '``') {
							current.pop();
							output += '``';
							i++;
						} else output += input[i];
					}
					output += span;
					if (current[current.length - 1] == 'code' && input[i] == '`') {
						output += '`';
					} else if (current[current.length - 1] == 'samp' && input.substr(i, 2) == '``') {
						output += '``';
					}
					this.value = output;				
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
	setTimeout(function(e) {
		e.mdValidate();
	}, 0, document.activeElement);
}

addEventListener('keyup', mdValidateBody);
addEventListener('keydown', mdValidateBody);
addEventListener('keypress', mdValidateBody);

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
		mainContentEl.style.height = Math.max(innerHeight - (footerOff ? -4 : footer) - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - 12, noPageOverflow) - mainBottomPad + 'px';
		if (sidebar) sidebar.style.height = '';
	} else {
		mainContentEl.style.height = '';
		if (navigator.userAgent.indexOf('Mobile') == -1) mainContentEl.style.minHeight = Math.max(0, innerHeight - (footerOff ? -4 : footer) - mainContentEl.getBoundingClientRect().top + document.body.getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12) - mainBottomPad) + 'px';
		else mainContentEl.style.minHeight = '';
		if (sidebar) {
			if (innerWidth >= 1500) sidebar.style.height = mainContentEl.style.minHeight;
			else sidebar.style.height = '';
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
		return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec' ][d.getUTCMonth()] + ' ' + d.getUTCDate() + (y == new Date().getUTCFullYear() ? '' : ' \'' + y.toString().substr(2));
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

document.addEventListener('visibilitychange', function() {
	if (!document.hidden) {
		request('/api/notif', function(res) {
			document.getElementById('nav').children[7].classList.toggle('unread', res);
		});
	}
});

if (navigator.userAgent.indexOf('Mobile') != -1) addEventListener('touchend', function() {}); //Fixes mobile-safari bug with touch listeners in iframes not firing