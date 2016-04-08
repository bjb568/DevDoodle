'use strict';
document.getElementById('sort').onchange = function() {
	window.location.href = '?sort=' + this.value;
};