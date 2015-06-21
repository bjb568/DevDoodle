// Derivitive of Rainbow 1.2 (liceneced under Apache License V2.0, see rainbowco.de and https://github.com/ccampbell/rainbow )
var Rainbow = (function() {
	var replacements = {},
		replacementPositions = {},
		languagePatterns = {},
		bypassDefaults = {},
		level = 0,
		defaultLang = 0;
	function matchInsideOtherMatch(start, end) { // Prevents a regex pattern from matching inside of a bigger pattern
		for (var key in replacementPositions[level]) {
			key = parseInt(key, 10);
			if ((start != key || end != replacementPositions[level][key]) && start <= key && end >= replacementPositions[level][key]) { // If block completely is enclosed by another block, remove the other block
				delete replacementPositions[level][key];
				delete replacements[level][key];
			}
			if (start >= key && start < replacementPositions[level][key] || end > key && end < replacementPositions[level][key]) return true; // Return true if they intersect
		}
		return false;
	}
	function processPattern(regex, pattern, code, callback) { // Finds occurances of a regex pattern in a block of code that should be processed, stores positions of where they should be replaced within the string
		var match = regex.exec(code);
		if (!match) return callback();
		if (!pattern.name && typeof pattern.matches[0] == 'string') { // Treat match 0 the same way as name
			pattern.name = pattern.matches[0];
			delete pattern.matches[0];
		}
		var replacement = match[0],
			startPos = match.index,
			endPos = startPos + match[0].length,
			processNext = function() {
				var nextCall = function() {
					processPattern(regex, pattern, code, callback);
				};
				return nextCall();
			};
		if (matchInsideOtherMatch(startPos, endPos)) return processNext(); // Skip if it's not a child match and it falls inside of another match that already happened
		var onMatchSuccess = function(replacement) {
				if (pattern.name) replacement = '<span class="' + pattern.name + '">' + replacement + '</span>';
				if (!replacements[level]) { // store what needs to be replaced with what's at this position
					replacements[level] = {};
					replacementPositions[level] = {};
				}
				replacements[level][startPos] = {
					'replace': match[0],
					'with': replacement
				};
				replacementPositions[level][startPos] = endPos;
				if (Math.random() < 0.005) setTimeout(processNext, 0);
				else processNext();
			},
			groupKeys = keys(pattern.matches),
			processGroup = function(i, groupKeys, callback) {
				if (i >= groupKeys.length) {
					return callback(replacement);
				}
				var processNextGroup = function() {
						processGroup(++i, groupKeys, callback);
					},
					block = match[groupKeys[i]];
				if (!block) return processNextGroup();
				var group = pattern.matches[groupKeys[i]],
					language = group.language,
					currentProcessGroup = group.name && group.matches ? group.matches : group,
					replaceAndContinue = function(block, replaceBlock, matchName) {
						var index = 0;
						for (var j = 1; j < groupKeys[i]; j++) {
							if (match[j]) index += match[j].length;
						}
						replacement = replaceAtPosition(index, block, matchName ? '<span class="' + matchName + '">' + replaceBlock + '</span>' : replaceBlock, replacement);
						processNextGroup();
					};
				if (language) { // If this is a sublanguage, process the block using that language
					return highlightBlockForLanguage(block, language, function(code) {
						replaceAndContinue(block, code);
					});
				}
				if (typeof group == 'string') return replaceAndContinue(block, block, group); // If this is a string then this match is directly mapped to selector so just wrap it in a span and continue
				processCodeWithPatterns(block, currentProcessGroup.length ? currentProcessGroup : [currentProcessGroup], function(code) { // processCodeWithPatterns always expects an array so we convert strings here
					replaceAndContinue(block, code, group.matches ? group.name : 0);
				});
			};
		processGroup(0, groupKeys, onMatchSuccess);
	}
	function replaceAtPosition(position, replace, replaceWith, code) {
		return code.substr(0, position) + code.substr(position).replace(replace, replaceWith);
	}
	function keys(object) { // Sorts object by index descending
		var locations = [],
			replacement;
		for (var location in object) {
			if (object.hasOwnProperty(location)) locations.push(location);
		}
		return locations.sort(function(a, b) {
			return b - a;
		});
	}
	function processCodeWithPatterns(code, patterns, callback) {
		level++; // Increase level so that replacements will not conflict with each other when processing subblocks of code
		function workOnPatterns(patterns, i) { // Processed patterns one at a time
			if (i < patterns.length) {
				return processPattern(patterns[i].pattern, patterns[i], code, function() {
					workOnPatterns(patterns, ++i);
				});
			}
			processReplacements(code, function(code) {
				delete replacements[level];
				delete replacementPositions[level];
				level--;
				callback(code);
			});
		}
		workOnPatterns(patterns, 0);
	}
	function processReplacements(code, callback) {
		function processReplacement(code, positions, i, callback) {
			if (i < positions.length) {
				var pos = positions[i],
					replacement = replacements[level][pos];
				code = replaceAtPosition(pos, replacement.replace, replacement.with, code);
				return processReplacement(code, positions, ++i, callback);
			}
			callback(code);
		}
		var stringPositions = keys(replacements[level]);
		processReplacement(code, stringPositions, 0, callback);
	}
	function highlightBlockForLanguage(code, language, callback) {
		var patterns = languagePatterns[language] || [],
			defaultPatterns = languagePatterns[defaultLang] || [];
		processCodeWithPatterns(code, bypassDefaults[language] ? patterns : patterns.concat(defaultPatterns), callback);
	}
	function highlightCodeBlock(codeBlocks, i, callback) {
		if (i < codeBlocks.length) {
			var block = codeBlocks[i],
				language = block.dataset.language;
			if (!block.classList.contains('rainbow') && language) {
				block.classList.add('rainbow');
				return highlightBlockForLanguage(block.innerHTML, language, function(code) {
					code = code.split('\n');
					block.classList.add('line-dig' + Math.floor(Math.log10(code.length)));
					block.innerHTML = code.map(function(line, i) {
						return '<span class="line" data-linenum="' + (i + 1) + '"></span>' + line;
					}).join('\n');
					replacements = {};
					replacementPositions = {};
					highlightCodeBlock(codeBlocks, ++i, callback);
				});
			}
			return highlightCodeBlock(codeBlocks, ++i, callback);
		}
		if (callback) callback();
	}
	function highlight(node, callback) {
		if (node.tagName == 'code') highlightCodeBlock([node], 0);
		node = node instanceof Event ? document : node;
		highlightCodeBlock(node.getElementsByTagName('code'), 0, callback);
	}
	return {
		extend: function(language, patterns, bypass) {
			if (arguments.length == 1) { // Extend the default language rules
				patterns = language;
				language = defaultLang;
			}
			bypassDefaults[language] = bypass;
			languagePatterns[language] = patterns.concat(languagePatterns[language] || []);
		},
		color: function() {
			if (typeof arguments[0] == 'string') return highlightBlockForLanguage(html(arguments[0]), arguments[1], arguments[2]);
			if (typeof arguments[0] == 'function') return highlight(0, arguments[0]);
			highlight(arguments[0], arguments[1]);
		}
	};
})();
document.addEventListener('DOMContentLoaded', Rainbow.color, false);
Rainbow.extend([
	{
		matches: {
			1: {
				name: 'string',
				matches: {
					name: 'escape',
					pattern: /\\u\{.{1,6}\}|\\u.{4}|\\x.{2}|\\(.)/g
				}
			}
		},
		pattern: /(('|")([^\\\1]|\\.)*?(\2))/gm
	},
	{
		name: 'comment',
		pattern: /\/\*[\s\S]*?\*\/|(\/\/|\#)[\s\S]*?$/gm
	},
	{
		matches: {
			1: 'number'
		},
		pattern: /(?:^|\D)(-?\d+(\.\d+)?(e(\+|\-)?\d+)?(f|d)?|0x[\da-f]+)\b/gi
	},
	{
		matches: {
			1: 'keyword'
		},
		pattern: /\b(and|array|as|b(ool(ean)?|reak)|c(ase|atch|har|lass|on(st|tinue))|d(ef|elete|o(uble)?)|e(cho|lse(if)?|xit|xtends|xcept)|f(inally|loat|or(each)?|unction)|global|if|import|in(stanceof)?|int(eger)?|long|new|object|of|or|pr(int|ivate|otected)|public|return|self|st(ring|ruct|atic)|switch|th(en|is|row)|this|try|typeof|(un)?signed|var|void|while|yield)(?=\(|\b)/gi
	},
	{
		name: 'constant',
		pattern: /true|false|null|nil/g
	},
	{
		name: 'operator assigns',
		pattern: /(\*|\/|%|\+|-|&lt;&lt;|&gt;&gt;(&gt;)?|&amp;|\^|\|)?=|\+\+|--/g
	},
	{
		name: 'operator',
		pattern: /!|==|===|!=|!==|\+|-|\*|\/|%|&(lt|gt);=?|&lt;&lt;|&gt;&gt;(&gt;)?|&amp;{1,2}|\|\|?|\^/g
	},
	{
		name: 'grouper',
		pattern: /[()[\]{}]/g
	},
	{
		name: 'punctuation',
		pattern: /\.|,|;/g
	},
	{
		matches: {
			1: 'function call'
		},
		pattern: /(\w+?)(?=\()/g
	},
	{
		matches: {
			1: 'keyword',
			2: 'function',
			3: 'arguments'
		},
		pattern: /(function)\s+(.*?)\((.*)\)/g
	}
]);
var globals = ['AnalyserNode','Animation','AnimationEffect','AnimationEffectReadOnly','AnimationEvent','AnimationTimeline','AnonymousContent','ApplicationCache','ApplicationCacheErrorEvent','Array','ArrayBuffer','Attr','Audio','AudioBuffer','AudioBufferSourceNode','AudioContext','AudioDestinationNode','AudioListener','AudioNode','AudioParam','AudioProcessingEvent','AudioStreamTrack','AutocompleteErrorEvent','BarProp','BatteryManager','BeforeLoadEvent','BeforeUnloadEvent','BiquadFilterNode','Blob','BlobEvent','Boolean','BroadcastChannel','CDATASection','CSS','CSS2Properties','CSSCharsetRule','CSSConditionRule','CSSCounterStyleRule','CSSFontFaceRule','CSSFoundFaceLoadEvent','CSSFoundFaceRule','CSSFoundFeatureValuesRule','CSSGroupingRule','CSSImportRule','CSSKeyframeRule','CSSKeyframesRule','CSSMediaRule','CSSMozDocumentRule','CSSNameSpaceRule','CSSPageRule','CSSPrimitiveValue','CSSRule','CSSRuleList','CSSStyleDeclaration','CSSStyleRule','CSSStyleSheet','CSSSupportsRule','CSSUnknownRule','CSSValue','CSSValueList','CSSViewportRule','Cache','CacheStorage','CanvasGradiant','CanvasGradient','CanvasPattern','CanvasRenderingContext2D','CaretPosition','ChannelMergerNode','ChannelSplitterNode','CharacterData','ClientRect','ClientRectList','ClipboardEvent','CloseEvent','CommandEvent','Comment','CompositionEvent','Console','Controllers','ConvolverNode','Counter','Crypto','CryptoKey','CustomEvent','DOMCursor','DOMError','DOMException','DOMImplementation','DOMMatrix','DOMMatrixReadOnly','DOMParser','DOMPoint','DOMPointReadOnly','DOMQuad','DOMRect','DOMRectList','DOMRectReadOnly','DOMRequest','DOMSettableTokenList','DOMStringList','DOMStringMap','DOMTokenList','DOMTransactionEvent','DataChannel','DataTransfer','DataTransferItem','DataTransferItemList','DataView','Date','DelayNode','DesktopNotification','DesktopNotificationCenter','DeviceLightEvent','DeviceMotionEvent','DeviceOrientationEvent','DeviceProximityEvent','Document','DocumentFragment','DocumentTimeline','DocumentType','DragEvent','DynamicsCompressorNode','Element','Entity','EntityReference','Error','ErrorEvent','EvalError','Event','EventException','EventSource','EventTarget','External','File','FileError','FileList','FileReader','Float32Array','Float64Array','FocusEvent','FontFace','FontFaceSet','FormData','Function','GainNode','Gamepad','GamepadAxisMoveEvent','GamepadButton','GamepadButtonEvent','GamepadEvent','HTMIFrameElement','HTMLAllCollection','HTMLAnchorElement','HTMLAppletElement','HTMLAreaElement','HTMLAudioElement','HTMLBRElement','HTMLBaseElement','HTMLBaseFontElement','HTMLBodyElement','HTMLButtonElement','HTMLCanvasElement','HTMLCollection','HTMLContentElement','HTMLDListElement','HTMLDataElement','HTMLDataListElement','HTMLDetailsElement','HTMLDialogElement','HTMLDirectoryElement','HTMLDivElement','HTMLDocument','HTMLElement','HTMLEmbedElement','HTMLFieldSetElement','HTMLFontElement','HTMLFormControlsCollection','HTMLFormElement','HTMLFrameElement','HTMLFrameSetElement','HTMLHRElement','HTMLHeadElement','HTMLHeadingElement','HTMLHtmlElement','HTMLIFrameElement','HTMLImageElement','HTMLInputElement','HTMLKeygenElement','HTMLLIElement','HTMLLabelElement','HTMLLegendElement','HTMLLinkElement','HTMLMEdiaElement','HTMLMapElement','HTMLMarqueeElement','HTMLMediaElement','HTMLMenuElement','HTMLMenuItemElement','HTMLMetaElement','HTMLMeterElement','HTMLModElement','HTMLOListElement','HTMLObjectElement','HTMLOptGroupElement','HTMLOptionElement','HTMLOptionsCollection','HTMLOutputElement','HTMLPRogressElement','HTMLParagraphElement','HTMLParamElement','HTMLPictureElement','HTMLPreElement','HTMLProgressElement','HTMLPropertiesCollection','HTMLQuoteElement','HTMLScriptElement','HTMLSelectElement','HTMLShadowElement','HTMLSourceElement','HTMLSpanElement','HTMLStyleElement','HTMLTableCaptionElement','HTMLTableCellElement','HTMLTableColElement','HTMLTableElement','HTMLTableRowElement','HTMLTableSectionElement','HTMLTemplateElement','HTMLTextAreaElement','HTMLTitleElement','HTMLTrackElement','HTMLUListElement','HTMLUnknownElement','HTMLVideoElement','HashChangeEvent','Headers','History','IDBCursor','IDBCursorWithValue','IDBDatabase','IDBFactory','IDBFileHandle','IDBFileRequest','IDBIndex','IDBKeyRange','IDBMutableFile','IDBObjectStore','IDBOpenDBRequest','IDBRequest','IDBTransaction','IDBVersionChangeEvent','Image','ImageBitmap','ImageData','Infinity','InputEvent','InputMethodContext','InstallTrigger','Int1','Int16Array','Int32Array','Int8Array','InternalError','Intl','Iterator','JSON','KeyEvent','KeyboardEvent','KeyframeEffectReadOnly','LocalMediaStream','Location','MIDIAccess','MIDIConnectionEvent','MIDIInput','MIDIInputMap','MIDIMessageEvent','MIDIOutput','MIDIOutputMap','MIDIPort','Map','Math','MediaController','MediaDeviceInfo','MediaDevices','MediaElementAudioSourceNode','MediaEncryptedEvent','MediaError','MediaKeyError','MediaKeyEvent','MediaKeyMessageEvent','MediaKeyNeededEvent','MediaKeySession','MediaKeyStatusMap','MediaKeySystemAccess','MediaKeys','MediaList','MediaQueryList','MediaQueryListEvent','MediaRecorder','MediaSource','MediaStream','MediaStreamAudioDestinationNode','MediaStreamAudioSourceNode','MediaStreamEvent','MediaStreamTrack','MediaStreamTrackEvent','MessageChannel','MessageEvent','MessagePort','MimeType','MimeTypeArray','MouseEvent','MouseSCrollEvent','MozCSSKeyframeRule','MozCSSKeyframesRule','MozMmsMessage','MozMobileMessagethread','MozPowerManager','MozSettingsEvent','MozSnsNessage','MutationEvent','MutationObserver','MutationRecord','NaN','NamedNodeMap','Navigator','Node','NodeFilter','NodeIterator','NodeList','Notation','Notification','NozContactChangeEvent','NptifyPaintEvent','Number','Object','OfflineAudioCompletionEvent','OfflineAudioContext','OfflineResourceList','Option','OscillatorNode','OverflowEvent','PageTransitionEvent','PaintRequest','PaintRequestList','PannerNode','Path2D','Performance','PerformanceEntry','PerformanceMark','PerformanceMeasure','PerformanceNavigation','PerformanceResourceTiming','PerformanceTiming','PeriodicWave','PermissionStatus','Permissions','Plugin','PluginArray','PopStateEvent','PopupBlockedEvent','ProcessingInstruction','ProgressEvent','Promise','PropertyNodeList','Proxy','PushManager','PushSubscription','RGBColor','RTCDataChannelEvent','RTCIceCandidate','RTCPeerConnectionEvent','RTCRtpReceiver','RTCRtpSender','RTCSessionDescription','RTCStatsReport','RadioNodeList','Range','RangeError','RangeException','ReadableByteStream','ReadableStream','RecordErrorEvent','Rect','ReferenceError','RegExp','Request','Response','SCriptProcessorNode','SCrollAreaEvent','SQLException','SVGAElement','SVGAltGlyphDefElement','SVGAltGlyphElement','SVGAltGlyphItemElement','SVGAngle','SVGAnimateColorElement','SVGAnimateElement','SVGAnimateMotionElement','SVGAnimateTransformElement','SVGAnimatedAngle','SVGAnimatedBoolean','SVGAnimatedEnumeration','SVGAnimatedInteger','SVGAnimatedLength','SVGAnimatedLengthList','SVGAnimatedNumber','SVGAnimatedNumberList','SVGAnimatedPreserveAspectRatio','SVGAnimatedRect','SVGAnimatedString','SVGAnimatedTransformList','SVGAnimationElement','SVGCircleElement','SVGClipPathElement','SVGColor','SVGComponentTransferFunctionElement','SVGCursorElement','SVGDefsElement','SVGDescElement','SVGDiscardElement','SVGDocument','SVGElement','SVGElementInstance','SVGElementInstanceList','SVGEllipseElement','SVGEscElement','SVGException','SVGFEBlendElement','SVGFEColorMatrixElement','SVGFEComplenentTransferElement','SVGFEComponentTransferElement','SVGFECompositeElement','SVGFEConvolveMatrixElement','SVGFEDiffuseLightingElement','SVGFEDisplacementMapElement','SVGFEDistanceLightElement','SVGFEDistantLightElement','SVGFEDropShadowElement','SVGFEFloodElement','SVGFEFuncAElement','SVGFEFuncBElement','SVGFEFuncGElement','SVGFEFuncRElement','SVGFEGaussianBlurElement','SVGFEImageElement','SVGFEMergeElement','SVGFEMergeNodeElement','SVGFEMorphologyElement','SVGFEOffsetElement','SVGFEPointLightElement','SVGFESpectacularLightingElement','SVGFESpecularLightingElement','SVGFESpotLightElement','SVGFETileElement','SVGFETurbulanceElement','SVGFETurbulenceElement','SVGFilterElement','SVGFontElement','SVGFontFaceElement','SVGFontFaceFormatElement','SVGFontFaceNameElement','SVGFontFaceSrcElement','SVGFontFaceUriElement','SVGForeignObjectElement','SVGGElement','SVGGelement','SVGGeometryElement','SVGGlyphElement','SVGGlyphRefElement','SVGGradientElement','SVGGraphicsElement','SVGHKernElement','SVGImageElement','SVGLength','SVGLengthList','SVGLineElement','SVGLinearGradientElement','SVGMPathElement','SVGMarkerElement','SVGMaskElement','SVGMatrix','SVGMetadataElement','SVGMissingGlyphElement','SVGNumber','SVGNumberList','SVGPaint','SVGPathElement','SVGPathSeg','SVGPathSegArcAbs','SVGPathSegArcRel','SVGPathSegClosePath','SVGPathSegCurvetoCubicAbs','SVGPathSegCurvetoCubicRel','SVGPathSegCurvetoCubicSmoothAbs','SVGPathSegCurvetoCubicSmoothRel','SVGPathSegCurvetoCubigRel','SVGPathSegCurvetoQuadraticAbs','SVGPathSegCurvetoQuadraticRel','SVGPathSegCurvetoQuadraticSmoothAbs','SVGPathSegCurvetoQuadraticSmoothRel','SVGPathSegCurvetoQuarticAbs','SVGPathSegCurvetoQuarticRel','SVGPathSegCurvetoQuarticSmoothAbs','SVGPathSegCurvetoQuarticSmoothRel','SVGPathSegLinetoAbs','SVGPathSegLinetoHorizontalAbs','SVGPathSegLinetoHorizontalRel','SVGPathSegLinetoRel','SVGPathSegLinetoVerticalAbs','SVGPathSegLinetoVerticalRel','SVGPathSegList','SVGPathSegMovetoAbs','SVGPathSegMovetoRel','SVGPatternElement','SVGPoint','SVGPointList','SVGPolygonElement','SVGPolylineElement','SVGPreserveAspectRatio','SVGRadialGradientElement','SVGRect','SVGRectElement','SVGRenderingIntent','SVGSVGElement','SVGScriptElement','SVGSetElement','SVGStopElement','SVGStringList','SVGStyleElement','SVGSwitchElement','SVGSymbolElement','SVGTRefElement','SVGTSpanElement','SVGTextContentElement','SVGTextElement','SVGTextPathElement','SVGTextPositioningElement','SVGTitleElement','SVGTransform','SVGTransformList','SVGUnitTypes','SVGUseElement','SVGVKernElement','SVGViewElement','SVGViewSpec','SVGZoomAndPan','SVGZoomEvent','Screen','ScreenOrientation','ScriptProcessorNode','SecurityPolicyViolationEvent','Selection','ServiceWorker','ServiceWorkerContainer','ServiceWorkerRegistration','Set','ShadowRoot','SharedWorker','SimpleGestureEvent','SourceBuffer','SourceBufferList','SpeechSynthesisEvent','SpeechSynthesisUtterance','StereoPannerNode','StopIteration','Storage','StorageEvent','String','StyleSheet','StyleSheetList','SubtleCrypto','Symbol','SymbolSyntaxError','SyntaxError','TetEncoder','Text','TextDecoder','TextEncoder','TextEvent','TextMetrics','TextTrack','TextTrackCue','TextTrackCueList','TextTrackList','TimeEvent','TimeRanges','Touch','TouchEvent','TouchList','TrackEvent','TransitionEvent','TreeWalker','TypeError','UIEvent','URIError','URL','URLSearchParams','Uint16Array','Uint32Array','Uint8Array','Uint8ClampedArray','UserMessageHandler','UserMessageHandlersNamespace','UserProximityEvent','VTTCue','VTTRegion','ValidityState','VideoPlaybackQuality','VideoStreamTrack','WaveShaperNode','WeakMap','WeakSet','WebGLActiveInfo','WebGLBuffer','WebGLContextEvent','WebGLFramebuffer','WebGLProgram','WebGLRenderBuffer','WebGLRenderbuffer','WebGLRenderingContext','WebGLShader','WebGLShaderPrecisionFormat','WebGLTexture','WebGLUniformLocation','WebGLVertextArray','WebKitAnimationEvent','WebKitCSSFilterValue','WebKitCSSKeyframeRule','WebKitCSSKeyframesRule','WebKitCSSMatrix','WebKitCSSRegionRule','WebKitCSSTransformValue','WebKitDataCue','WebKitMediaKeyError','WebKitMediaKeyMessageEvent','WebKitMediaKeySession','WebKitMediaKeys','WebKitMutationObserver','WebKitNamespace','WebKitPoint','WebKitTransitionEvent','WebSocket','WheelEVent','WheelEvent','Window','Worker','XMLDocument','XMLHTTPRequest','XMLHTTPRequestEventTarget','XMLHTTPRequestUpload','XMLHttpRequest','XMLHttpRequestEventTarget','XMLHttpRequestException','XMLHttpRequestProgressEvent','XMLHttpRequestUpload','XMLSerializer','XMLStylesheetProcessingInstruction','XPathEvaluater','XPathEvaluator','XPathException','XPathExperssion','XPathExpression','XPathResult','XPatyResult','XSLTProcessor','__proto__','alert','applicationCache','atob','blur','btoa','caches','cancelAnimationFrame','captureEvents','chrome','clearInterval','clearMaxGCPauseAccumulator','clearTimeout','clientInformation','close','closed','confirm','connectShark','console','constructor','content','crypto','decodeUIComponent','decodeURI','decodeURIComponent','defaultStatus','defaultstatus','devicePixelRatio','disconnectShark','document','dump','dumpProfile','encodeURI','encodeURIComponent','escape','eval','event','external','fetch','find','focus','frameElement','frames','fullScreen','getComputedStyle','getDefaultComputedStyle','getMaxGCPauseSinceClear','getSelection','history','indexedDB','innerHeight','innerWidth','isFinite','isNaN','length','localStorage','location','locationbar','matchMedia','menubar','moveBy','moveTo','mozAnimationStartTime','mozCancelAnimationFrame','mozCancelRequestAnimationFrame','mozContact','mozInnerScreenX','mozInnerScreenY','mozPaintCount','mozRTCIceCandidate','mozRTCPeerConnection','mozRTCSessionDescription','mozRequestAnimationFrame','name','navigator','netscape','offscreenBuffering','onabort','onafterprint','onbeforeprint','onbeforeunload','onblur','oncanplay','oncanplaythrough','onchange','onclick','oncontextmenu','ondblclick','ondevicelight','ondevicemotion','ondeviceorientation','ondeviceproximity','ondrag','ondragend','ondragenter','ondragleave','ondragover','ondragstart','ondrop','ondurationchange','onemptied','onended','onerror','onfocus','onhashchange','oninput','oninvalid','onkeydown','onkeypress','onkeyup','onlanguagechange','onload','onloadeddata','onloadedmetadata','onloadstart','onmessage','onmousedown','onmouseenter','onmouseleave','onmousemove','onmouseout','onmouseover','onmouseup','onmousewheel','onmozfullscreenchange','onmozfullscreenerror','onmozpointerlockchange','onmozpointerlockerror','onoffline','ononline','onpagehide','onpageshow','onpause','onplay','onplaying','onpopstate','onprogress','onratechange','onreset','onresize','onscroll','onsearch','onseeked','onseeking','onselect','onshow','onstalled','onstorage','onsubmit','onsuspend','ontimeupdate','ontransitionend','onunload','onuserproximity','onvolumechange','onwaiting','onwebkitanimationend','onwebkitanimationiteration','onwebkitanimationstart','onwebkittransitionend','onwheel','open','opener','outerHeight','outerWidth','pageXOffset','pageYOffset','parent','parseFloat','parseInt','pauseProfilers','performance','personalbar','postMessage','print','prompt','releaseEvents','requestAnimationFrame','resizeBy','resizeTo','resumeProfilers','screen','screenLeft','screenTop','screenX','screenY','scroll','scrollBy','scrollByLines','scrollByPages','scrollMaxX','scrollMaxY','scrollTo','scrollX','scrollY','scrollbars','self','sessionStorage','setInterval','setResizable','setTimeout','showModalDialog','sidebar','sizeToContent','speechSynthesis','startProfiling','startShark','status','statusbar','stop','stopProfiling','stopShark','styleMedia','toolbar','top','undefined','unescape','uneval','updateCommands','webkitAudioContext','webkitAudioPannerNode','webkitIDBCursor','webkitIDBDatabase','webkitIDBFactory','webkitIDBIndex','webkitIDBKeyRange','webkitIDBObjectStore','webkitIDBRequest','webkitIDBTransaction','webkitIndexedDB','webkitMediaStream','webkitNotifications','webkitOfflineAudioContext','webkitRTCPeerConnection','webkitSpeechGrammar','webkitSpeechGrammarList','webkitSpeechRecognition','webkitSpeechRecognitionError','webkitSpeechRecognitionEvent','webkitStorageInfo','webkitURL','window'],
	methods = {
		document: ['open', 'close', 'write', 'writeln', 'clear', 'captureEvents', 'releaseEvents', 'getElementsByTagName', 'getElementsByTagNameNS', 'getElementsByClassName', 'createDocumentFragment', 'createTextNode', 'createComment', 'createProcessingInstruction', 'importNode', 'adoptNode', 'createAttribute', 'createAttributeNS', 'createEvent', 'createRange', 'createNodeIterator', 'createTreeWalker', 'createCDATASection', 'getElementsByName', 'hasFocus', 'execCommand', 'queryCommandEnabled', 'queryCommandIndeterm', 'queryCommandState', 'queryCommandSupported', 'queryCommandValue', 'elementFromPoint', 'elementsFromPoint', 'getSelection', 'exitPointerLock', 'registerElement', 'createElement', 'createElementNS', 'caretRangeFromPoint', 'getCSSCanvasContext', 'webkitCancelFullScreen', 'webkitExitFullscreen', 'getElementById', 'querySelector', 'querySelectorAll', 'createExpression', 'createNSResolver', 'evaluate', 'hasChildNodes', 'normalize', 'cloneNode', 'isEqualNode', 'compareDocumentPosition', 'contains', 'lookupPrefix', 'lookupNamespaceURI', 'isDefaultNamespace', 'insertBefore', 'appendChild', 'replaceChild', 'removeChild', 'isSameNode', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'createEntityReference', 'getOverrideStyle', 'webkitGetNamedFlows', 'isSupported', 'getItems', 'releaseCapture', 'mozSetImageElement', 'mozCancelFullScreen', 'mozExitPointerLock', 'enableStyleSheetsForSet', 'caretPositionFromPoint', 'getBoxQuads', 'convertQuadFromNode', 'convertRectFromNode', 'convertPointFromNode']
	};
Rainbow.extend('javascript', [
	{
		matches: {
			1: 'browser',
			2: 'punctuation',
			3: 'browser method'
		},
		pattern: new RegExp('(document)(\\.)(' + methods.document.join('|') + ')(?=\\()', 'g')
	},
	{
		matches: {
			1: 'punctuation',
			2: 'browser property'
		},
		pattern: /(\.)(length|name|width|height|x|y|z|classList|children|childNodes|(previous|next)(Element)?Sibling|parent(Element|Node)|(first|last)child|dataset)/g
	},
	{
		matches: {
			1: 'punctuation',
			2: 'browser method'
		},
		pattern: /(\.)(apply|bind|call|cloneNode|form|isArray|observe|of|toString|toFixed|addEventListener|removeEventListener)(?=\()/g
	},
	{
		matches: {
			1: 'browser',
			2: 'punctuation',
			3: 'browser method'
		},
		pattern: /(JSON)(\.)(parse|stringify)(?=\()/g
	},
	{
		matches: {
			1: 'browser',
			2: 'punctuation',
			3: 'browser'
		},
		pattern: /(Number)(\.)(EPSILON|MAX_SAFE_INTEGER|MAX_VALUE|MIN_SAFE_INTEGER|MIN_VALUE|NaN|NEGATIVE_INFINITY|POSITIVE_INFINITY)/g
	},
	{
		matches: {
			1: 'browser',
			2: 'punctuation',
			3: 'browser method'
		},
		pattern: /(Number)(\.)(isNaN|isFinite|isInteger|isSafeInteger|parseFloat|parseInt)(?=\()/g
	},
	{
		matches: {
			1: 'support property'
		},
		pattern: /\.(length|node(Name|Value))\b/g
	},
	{
		name: 'regex',
		matches: {
			1: 'regex open',
			2: {
				name: 'escape',
				pattern: /\\(.){1}/g
			},
			3: 'regex close',
			4: 'regex modifier'
		},
		pattern: /(\/)(?!\*)((?:[^\\\1\n]|\\.)+?)(\/)([igm]{0,3})/g
	},
	{
		matches: {
			1: 'keyword',
			2: [
				{
					name: 'function prototype',
					pattern: /prototype/g
				},
				{
					name: 'browser',
					pattern: new RegExp('\\b(' + globals.join('|') + ')\\b', 'g')
				},
				{
					name: 'function',
					pattern: /\w+/g
				},
				{
					name: 'punctuation',
					pattern: /\./g
				}
			],
			3: 'operator assigns',
			4: 'keyword',
			5: 'grouper',
			6: 'arguments',
			7: 'grouper'
		},
		pattern: /(var)?(?:\s|^)(\S+)\s*(=)\s*(function)\s*(\()(.*)(\))/g
	},
	{
		name: 'browser',
		pattern: new RegExp('\\b(' + globals.join('|') + ')\\b', 'g')
	},
]);