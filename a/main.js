var noPageOverflow = noPageOverflow || false;
function minHeight() {
	if (noPageOverflow) {
		document.getElementById('content').style.height = Math.max(innerHeight - document.getElementById('footer').offsetHeight - document.getElementById('content').getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12), noPageOverflow) + 'px';
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