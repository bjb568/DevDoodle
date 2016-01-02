var changetypeStat = document.getElementById('changetypeStat'),
	adduserinput = document.getElementById('adduserinput'),
	type = document.getElementById('type'),
	prevType = type.value;
type.onchange = function changeType() {
	changetypeStat.classList.remove('saved');
	changetypeStat.textContent = 'Saving…';
	var currentType = type.value;
	request('/api/chat/changeroomtype', function(res) {
		if (res.indexOf('Error') == 0) {
			changetypeStat.textContent = '';
			alert(res);
			type.value = prevType;
		} else if (res == 'Success') {
			changetypeStat.classList.add('saved');
			changetypeStat.textContent = 'Saved';
			prevType = currentType;
		} else {
			changetypeStat.textContent = '';
			alert('Unknown error updating room access. Response was: ' + res);
			type.value = prevType;
		}
	}, 'type=' + currentType);
};
document.getElementById('changetype').onsubmit = function(e) {
	e.preventDefault();
	changeType();
};
document.getElementById('adduser').onsubmit = function(e) {
	e.preventDefault();
	adduserinput.disabled = true;
	request('/api/chat/inviteuser', function(res) {
		adduserinput.disabled = false;
		if (res.indexOf('Error') == 0) alert(res);
		else {
			try {
				res = JSON.parse(res);
			} catch(e) {
				return alert('Unknown error adding user. Response was: ' + res);
			}
			var div = document.createElement('div'),
				img = document.createElement('img');
			div.classList.add('user');
			div.classList.add('lft');
			img.src = res.pic;
			img.width = img.height = 40;
			div.appendChild(img);
			var onrit = document.createElement('div'),
				anchor = document.createElement('a');
			anchor.href = '/user/' + adduserinput.value;
			anchor.appendChild(document.createTextNode(adduserinput.value));
			var rep = document.createElement('small');
			rep.classList.add('rep');
			rep.appendChild(document.createTextNode(res.rep));
			onrit.appendChild(anchor);
			onrit.appendChild(rep);
			div.appendChild(onrit);
			var span = document.createElement('span');
			span.appendChild(document.createTextNode('✕'));
			span.onclick = remuser;
			div.appendChild(span);
			document.getElementById('users').appendChild(div);
			adduserinput.value = '';
		}
		adduserinput.focus();
	}, 'user=' + adduserinput.value);
};
function remuser() {
	var el = this.parentNode;
	el.classList.add('rem');
	request('/api/chat/uninviteuser', function(res) {
		if (res.indexOf('Error') == 0) {
			el.classList.remove('rem');
			alert(res);
		} else if (res == 'Success') {
			el.parentNode.removeChild(el);
		} else {
			el.classList.remove('rem');
			alert('Unknown error removing user. Response was: ' + res);
		}
	}, 'user=' + el.children[1].children[0].textContent);
}
var els = document.getElementsByClassName('user');
for (var i = 0; i < els.length; i++) {
	els[i].getElementsByTagName('span')[0].onclick = remuser;
}