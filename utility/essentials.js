'use strict';
function html(input) {
	return input.toString().replaceAll(['&', '<', '>', '"', '\t', '\n', '\b'], ['&amp;', '&lt;', '&gt;', '&quot;', '&#9;', '&#10;', '']);
}
function warning(message) {
	//console.log(message);
	//Ignore markdown warnings on server
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
		if (!['code', 'samp'].includes(current[current.length - 1])) {
			if (input[i] == '\\') span += input[++i].replace('^', '\u0001').replace('[', '\u0002');
			else {
				for (var l = 3; l > 0; l--) {
					if (tags[input.substr(i, l)]) {
						output += spanMarkdown(span);
						span = '';
						if (current[current.length - 1] == tags[input.substr(i, l)]) output += '</' + current.pop() + '>';
						else {
							if (current.includes(tags[input.substr(i, l)])) warning('Illegal nesting of "' + input.substr(i, l) + '"');
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
function passStrength(pass) {
	var uniqueChars = [];
	for (var i = 0; i < pass.length; i++) {
		if (!uniqueChars.includes(pass[i])) uniqueChars.push(pass[i]);
	}
	var penalties = /(.+?)(.*)(\1+)/g,
		match,
		deductions = 0;
	while (match = penalties.exec(pass)) deductions += (4 - match[2].length / 2).bound(0.5, 3) * Math.pow(match[1].length + match[3].length, 1.4) / Math.sqrt(match[1].length + 3);
	penalties = /\d+/g;
	while (match = penalties.exec(pass)) deductions += Math.pow(match[0].length, 1.5);
	penalties = /\w{2,}/gi;
	while (match = penalties.exec(pass)) deductions += match[0].length * 1.5;
	return 1 - 1 / (1 + Math.pow(2, uniqueChars.length / 2 - Math.pow(deductions, 2 / 3) / 10 + pass.length / 8 - 8));
}

module.exports = {
	html,
	spanMarkdown,
	inlineMarkdown,
	markdown,
	passStrength,
	mime: {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'text/javascript',
		'.png': 'image/png',
		'.svg': 'image/svg+xml',
		'.mp3': 'audio/mpeg',
		'.ico': 'image/x-icon'
	}
};