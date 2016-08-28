'use strict';
document.getElementById('form').onchange = function() {
	window.location.href = '?sort=' + document.getElementsByName('sort')[0].value + '&preview=' + (document.getElementsByName('preview')[0].checked ? 1 : 0);
};