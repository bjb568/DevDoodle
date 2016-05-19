'use strict';
var form = document.getElementById('form'),
	title = document.getElementById('title'),
	lang = document.getElementById('lang'),
	langsug = document.getElementById('langsug'),
	description = document.getElementById('description'),
	question = document.getElementById('question'),
	code = document.getElementById('codeta'),
	tags = document.getElementById('tags'),
	err1 = document.getElementById('err1'),
	err3 = document.getElementById('err3');
function smoothScroll(el, t, p, s) {
	p = t - p;
	var dist = el.getBoundingClientRect().top,
		now = new Date().getTime();
	s = s || now;
	var elapsed = now - s;
	if (dist > 6 && document.body.scrollTop - document.body.scrollHeight + innerHeight) {
		scrollBy(0, Math.min(dist - 5, Math.max(1, p * dist * elapsed * elapsed / 50000000)));
		requestAnimationFrame(function(p) {
			smoothScroll(el, p, t, s);
		});
	}
}
addEventListener('input', function() {
	if (document.activeElement.parentNode.classList.contains('ta-cont')) {
		document.activeElement.nextElementSibling.textContent = document.activeElement.value + '\n';
		document.activeElement.parentNode.style.height = document.activeElement.nextElementSibling.offsetHeight + 'px';
	}
});
var step = 0,
	langs = JSON.parse(document.getElementById('langs').value),
	waiting = false;
document.getElementById('types').onchange = function() {
	if (this.querySelector(':checked')) {
		document.getElementById('titlehelp').classList.remove('hide');
		document.getElementById('step0').classList.remove('hide');
		title.focus();
	}
};
lang.addEventListener('keyup', function() {
	if (!(langsug.hidden = !this.value)) {
		var firstChild;
		while (firstChild = langsug.firstChild) langsug.removeChild(firstChild);
		var i = this.value.length,
			used = [];
		while (used.length < 2) {
			for (var j = 0; j < langs.length; j++) {
				if (used.indexOf(langs[j]) == -1 && langs[j].substr(0, i).toLowerCase() == this.value.substr(0, i).toLowerCase()) {
					used.push(langs[j]);
					var span = document.createElement('span');
					span.appendChild(document.createTextNode(langs[j]));
					span.onmousedown = function(e) {
						e.preventDefault();
						lang.value = this.textContent;
						this.parentNode.hidden = true;
						findTags();
					};
					langsug.appendChild(span);
					langsug.appendChild(document.createTextNode(' '));
				}
			}
			if (i == 0) return;
			i--;
		}
	}
});
lang.addEventListener('keydown', function(e) {
	if (this.value && e.which == 9) {
		this.value = langsug.firstChild.textContent;
		form.onsubmit();
	}
});
function findDups() {
	request('/api/question/search', function(res) {
		try {
			res = JSON.parse(res);
		} catch (e) {
			alert('JSON Error. Response was: ' + res);
			res = [];
		}
		var duplist = document.getElementById('duplist'), fc;
		while (fc = duplist.firstChild) duplist.removeChild(fc);
		for (var i = 0; i < res.length; i++) {
			var li = document.createElement('li'),
				h3 = document.createElement('h3'),
				a = document.createElement('a');
			a.appendChild(document.createTextNode(res[i].title.replace(/(\S{30})\S*/g, '$1')));
			a.href = res[i]._id;
			a.target = '_blank';
			h3.appendChild(a);
			li.appendChild(h3);
			var blockquote = document.createElement('blockquote');
			blockquote.innerHTML = markdown(res[i].body);
			li.appendChild(blockquote);
			duplist.appendChild(li);
		}
		if (!res.length) {
			duplist.appendChild(document.createTextNode('No related questions found.'));
			if (step == 1) form.onsubmit();
		}
	}, 'lang=' + encodeURIComponent(lang.value) + '&search=' + encodeURIComponent(title.value));
}
document.getElementById('reload-dups').onclick = function(e) {
	e.preventDefault();
	findDups();
};
lang.addEventListener('blur', function() {
	langsug.hidden = true;
});
lang.addEventListener('focus', function() {
	langsug.hidden = !this.value;
});
function findTags() {
	var fc;
	while (fc = tags.firstChild) tags.removeChild(fc);
	if (!lang.value) return;
	request('/api/qa/tags', function(res) {
		var child;
		while (child = tags.firstChild) tags.removeChild(child);
		if (res.indexOf('Error:') == 0) return alert(res);
		if (res == '[]' && !err1.textContent) {
			err1.classList.add('tag-warning');
			return err1.textContent = 'No tags found for language.';
		}
		try {
			res = JSON.parse(res);
		} catch (e) {
			return alert('JSON error. Response was: ' + res);
		}
		var labels = {};
		for (var i = 0; i < res.length; i++) {
			var label = document.createElement('label'),
				checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.id = 'tag' + res[i]._id;
			label.appendChild(checkbox);
			label.appendChild(document.createTextNode(' ' + res[i].name));
			labels[res[i]._id] = label;
		}
		var divs = {};
		for (var i = 0; i < res.length; i++) {
			if (!res[i].parentID) tags.appendChild(labels[res[i]._id]);
			else {
				if (!divs[res[i].parentID]) {
					divs[res[i].parentID] = document.createElement('div');
					divs[res[i].parentID].classList.add('indt');
					labels[res[i].parentID].addEventListener('click', function() {
						if (!this.children[0].checked) {
							var e = this.nextElementSibling.getElementsByTagName('input');
							for (var i = 0; i < e.length; i++) e[i].checked = false;
						}
					});
				}
				divs[res[i].parentID].appendChild(labels[res[i]._id]);
				labels[res[i]._id].onclick = function() {
					if (this.children[0].checked) {
						var ref = this.parentNode.previousElementSibling;
						ref.children[0].checked = true;
						if (ref.onclick) ref.onclick();
					}
				};
			}
		}
		for (var i in divs) {
			var ref = document.getElementById('tag' + i).parentNode;
			ref.parentNode.insertAfter(divs[i], ref);
		}
		if (!err1.classList.contains('tag-warning')) return;
		err1.classList.remove('tag-warning');
		form.onsubmit();
	}, 'lang=' + encodeURIComponent(lang.value));
}
lang.onblur = findTags;
question.mdValidate = mdValidate;
form.onsubmit = function(e) {
	if (e) {
		e.preventDefault();
		if (waiting) return;
	}
	if (description.mdValidate(true) || question.mdValidate(true)) return;
	if (step == 0) {
		if (!tags.children.length) {
			lang.focus();
			err1.classList.add('tag-warning');
			err1.textContent = 'No tags found for language.';
			return;
		}
		err1.classList.remove('tag-warning');
		if (title.value.length < 12) {
			title.focus();
			err1.textContent = 'Title must be at least 12 characters long.';
			return;
		}
		if (title.value.length > 144) {
			title.focus();
			err1.textContent = 'Title must be no longer than 144 characters.';
			return;
		}
		if (!lang.value) {
			lang.focus();
			err1.textContent = 'Please choose a language.';
			return;
		}
		err1.hidden = true;
		step = 1;
		document.getElementById('submit1').hidden = true;
		document.getElementById('submit2').hidden = false;
		if (document.activeElement) document.activeElement.blur();
		document.getElementById('step1').classList.remove('hide');
		smoothScroll(document.getElementById('step1'));
		waiting = true;
		setTimeout(function() {
			waiting = document.getElementById('submit2').disabled = false;
		}, 8000);
		findDups();
		findTags();
		document.getElementById('titlehelp').classList.add('hide');
	} else if (step == 1) {
		step = 2;
		document.getElementById('submit2').hidden = true;
		document.getElementById('submit3').hidden = false;
		document.getElementById('step2').classList.remove('hide');
		smoothScroll(document.getElementById('explainhelp'));
		description.required = question.required = true;
		question.pattern = "[^\\?]{11,}\\?";
		setTimeout(function() {
			description.focus();
		}, 400);
		document.getElementById('explainhelp').classList.remove('hide');
	} else if (step == 2) {
		if (description.value.length < 144) {
			description.focus();
			err3.textContent = 'Question description must be at least 144 characters long. Could you add more detail?';
			return;
		}
		if (question.value.length < 12) {
			question.focus();
			err3.textContent = 'Core question must be at least 12 characters long.';
			return;
		}
		if (question.value.lastIndexOf('?') != question.value.length - 1) {
			question.focus();
			err3.textContent = 'A question must end in a question mark.';
			return;
		}
		if (question.value.length > 144) {
			question.focus();
			err3.textContent = 'Core question must be no longer than 144 characters.';
			return;
		}
		err3.hidden = true;
		step = 3;
		document.getElementById('submit3').hidden = true;
		document.getElementById('submit4').hidden = false;
		document.getElementById('step3').classList.remove('hide');
		smoothScroll(document.getElementById('codehelp'));
		setTimeout(function() {
			code.focus();
		}, 400);
		document.getElementById('codehelp').classList.remove('hide');
		document.getElementById('explainhelp').classList.add('hide');
	} else if (step == 3) {
		step = 4;
		document.getElementById('submit4').hidden = true;
		document.getElementById('step4').classList.remove('hide');
		smoothScroll(document.getElementById('step4'));
		document.getElementById('codehelp').classList.add('hide');
	}
};
tags.onchange = function() {
	setTimeout(function() {
		var arr = [],
			els = tags.querySelectorAll(':checked');
		for (var i = 0; i < els.length; i++) {
			arr.push(els[i].id.substr(3));
		}
		document.getElementById('tags-input').value = arr.join();
	}, 0);
};
document.getElementById('step4').onchange = function() {
	document.getElementById('showpreview').disabled = !tags.querySelector(':checked');
};
document.getElementById('showpreview').onclick = function(e) {
	e.preventDefault();
	var preview = document.getElementById('preview'), fc;
	while (fc = preview.firstChild) preview.removeChild(fc);
	var h1 = document.createElement('h1');
	h1.appendChild(document.createTextNode(lang.value + ': ' + title.value + ' '));
	var close = document.createElement('small');
	close.appendChild(document.createTextNode('✕'));
	close.onclick = function() {
		preview.hidden = true;
		document.body.classList.remove('tint');
	};
	h1.appendChild(close);
	preview.appendChild(h1);
	var body = document.createElement('div');
	body.innerHTML = markdown(description.value) +
		(code.value ? '<code class="blk">' + html(code.value) + '</code>' : '') +
		'<p><strong>' + inlineMarkdown(question.value) + '</strong></p>';
	preview.appendChild(body);
	var submit = document.createElement('button');
	submit.appendChild(document.createTextNode('Post Question'));
	submit.id = 'submit';
	submit.onclick = function() {
		this.classList.add('working');
		request('/api/question/add', function(res) {
			if (res.substr(0, 7) == 'Error: ') alert(res);
			else if (res.substr(0, 10) == 'Location: ') location.href = res.substr(10);
			else alert('Unknown error. Response was: ' + res);
		},
			'title=' + encodeURIComponent(title.value) +
			'&lang=' + encodeURIComponent(lang.value) +
			'&description=' + encodeURIComponent(description.value) +
			'&question=' + encodeURIComponent(question.value) +
			'&code=' + encodeURIComponent(code.value) +
			'&type=' + encodeURIComponent(document.getElementById('types').querySelector(':checked').value) +
			'&tags=' + encodeURIComponent(document.getElementById('tags-input').value) +
			'&gr=' + encodeURIComponent(document.getElementById('gr').value) +
			'&self=' + encodeURIComponent(document.getElementById('self').value) +
			'&bounty=' + encodeURIComponent(document.getElementById('bounty').value)
		);
	};
	preview.appendChild(submit);
	preview.hidden = false;
	document.body.classList.add('tint');
	e.stopPropagation();
};
document.getElementById('preview').addEventListener('click', function(e) {
	e.stopPropagation();
});
addEventListener('click', function() {
	document.getElementById('preview').hidden = true;
	document.body.classList.remove('tint');
});