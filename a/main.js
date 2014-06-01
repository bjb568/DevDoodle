String.prototype.replaceAll = function(find, replace) {
	if (typeof find == 'string') return this.split(find).join(replace);
	var t = this,
		i, j;
	while ((i = find.shift()) && (j = replace.shift())) t.replaceAll(i, j);
	return t;
};
String.prototype.repeat = function(num) {
	return new Array(++num).join(this);
};

var noPageOverflow = noPageOverflow || false;
var footerOff = false;

function minHeight() {
	if (noPageOverflow && innerWidth >= 700) {
		document.getElementById('content').style.height = Math.max(innerHeight - (footerOff ? -28 : document.getElementById('footer').offsetHeight) - document.getElementById('content').getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12), noPageOverflow) + 'px';
	} else {
		document.getElementById('content').style.minHeight = innerHeight - document.getElementById('footer').offsetHeight - document.getElementById('content').getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12) + 'px';
	}
};

function ago(d) {
	d = Math.round((new Date() - d) / 1000);
	if (d < 60) {
		d = 'now';
	} else if (d < 100) {
		d = 'a minute ago';
	} else if (d < 3000) {
		d /= 60;
		d = Math.round(d);
		d += ' minutes ago';
	} else if (d < 6000) {
		d = 'an hour ago';
	} else if (d < 85000) {
		d /= 3600;
		d = Math.round(d);
		d += ' hours ago';
	} else if (d < 150000) {
		d = 'yesterday';
	} else {
		d /= 86400;
		d = Math.round(d);
		d += ' days ago';
	}
	return d;
};

function agot(d) {
	var time = document.createElement('time');
	time.textContent = ago(d);
	time.setAttribute('datetime', new Date(d).toISOString());
	return time;
};
addEventListener('DOMContentLoaded', function() {
	if (navigator.userAgent.indexOf('Trident') === -1 && navigator.userAgent.indexOf('MSIE') === -1) {
		document.getElementById('err').hidden = true;
		document.getElementById('cont').style.visibility = '';
		minHeight();
	}
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
						start = -1,
						end = -1,
						oS = this.selectionStart,
						oE = this.selectionEnd;
					while (++start < lines.length || (--start && 0)) if ((i += lines[start].length) >= this.selectionStart) break;
					i = 0;
					while (++end < lines.length || (--end && 0)) if ((i += lines[end].length) >= this.selectionEnd) break;
					i = --start;
					var n = 0;
					while (++i <= end) {
						if (e.shiftKey) lines[i][0] != '\t' ? n += lines[i].length : (lines[i] = lines[i].substr(1));
						else lines[i] = '\t' + lines[i];
					}
					this.value = lines.join('\n');
					this.selectionStart = oS - (e.shiftKey ? 0 : 1);
					this.selectionEnd = oE + (e.shiftKey ? -1 : 1) * (end - start - n);
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
addEventListener('load', function() {
	minHeight();
});
addEventListener('resize', minHeight);