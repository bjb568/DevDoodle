var tname = document.getElementById('name'),
	lang = document.getElementById('lang'),
	par = document.getElementById('par');
document.getElementById('addtag').onsubmit = function() {
	request('/api/qa/tags/add', function(res) {
		if (res.indexOf('Error:') == 0) return alert(res);
		else {
			try {
				res = JSON.parse(res);
			} catch(e) {
				return alert('Unknown error. Response was: ' + res);
			}
			var li = document.createElement('li'),
				permalink = document.createElement('a');
			permalink.classList.add('small');
			permalink.href = '#' + res._id;
			permalink.appendChild(document.createTextNode('#' + res._id));
			li.appendChild(permalink);
			li.appendChild(document.createTextNode(' ' + res.name));
			if (res.parentID) {
				var e = document.getElementById(res.parentID);
				if (e) e.lastElementChild.appendChild(li);
				else location.reload();
			}
			else if (document.getElementById('lang-' + res.lang)) document.getElementById('lang-' + res.lang).children[1].appendChild(li);
			else location.reload();
			tname.value = lang.value = par.value = '';
		}
	}, 'name=' + encodeURIComponent(tname.value) + '&lang=' + encodeURIComponent(lang.value) + '&par=' + par.value);
	return false;
};
tname.addEventListener('focus', function() {
	document.body.classList.add('active');
});
tname.addEventListener('blur', function(e) {
	if (e.relatedTarget) document.body.classList.remove('active');
	else this.focus();
});
onclick = function(e) {
	if (!document.body.classList.contains('active')) return;
	var e = e.target;
	while (e) {
		if (!isNaN(parseInt(e.id)) && !par.value) {
			par.value = e.id;
			document.body.classList.remove('active');
		}
		if (e.tagName == 'h2' && !lang.value) lang.value = e.textContent;
		if (e.tagName == 'section' && !lang.value) e = e.firstElementChild;
		else e = e.parentNode;
	}
}