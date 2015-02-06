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
							.replace(/\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, '$1'.link('$2'))
							.replace(/([^;["\\])(https?:\/\/([^\s("\\]+\.[^\s"\\]+\.(svg|png|tiff|jpg|jpeg)(\?[^\s"\\\/]*)?))/, '$1<img src="$2" />')
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
		} else return '<p>' + inlineMarkdown(val) + '</p>';
	}).join('');
}

module.exports = {
	html: html,
	markdownEscape: markdownEscape,
	inlineMarkdown: inlineMarkdown,
	markdown: markdown
};