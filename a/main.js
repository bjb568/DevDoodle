function minHeight() {
	document.getElementById('content').style.minHeight = innerHeight - document.getElementById('footer').offsetHeight - document.getElementById('content').getBoundingClientRect().top - (innerWidth < 1500 ? 6 : 12) + 'px';
}
addEventListener('DOMContentLoaded', function() {
	if (navigator.userAgent.indexOf('Trident') === -1 && navigator.userAgent.indexOf('MSIE') === -1) {
		document.getElementById('err').hidden = true;
		document.getElementById('cont').style.visibility = '';
		minHeight();
	}
});
addEventListener('load', function() {
	minHeight();
});
addEventListener('resize', minHeight);