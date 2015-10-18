document.getElementById('orderby').onchange = document.getElementById('orderdir').onchange = document.getElementById('where').onchange = function() {
	window.location.href = '?orderby=' + document.getElementById('orderby').value + '&orderdir=' + document.getElementById('orderdir').value + '&where=' + document.getElementById('where').value;
};