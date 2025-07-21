const styles = {
	base: CodeAreaStyle(`color: #d4d4d4`),
	comment: CodeAreaStyle(`color: #6a9955`),
	string: CodeAreaStyle(`color: #ce9178`),
	keyword: CodeAreaStyle(`color: #c586c0`),
	modifier: CodeAreaStyle(`color: #569cd6`),
	number: CodeAreaStyle(`color: #b5cea8`),
	type: CodeAreaStyle(`color: #4ec9b0`),
	method: CodeAreaStyle(`color: #dcdcaa`),
	identifier: CodeAreaStyle(`color: #9cdcfe`),
	const: CodeAreaStyle(`color: #4fc1ff`),
	brackets: [CodeAreaStyle(`color: #ffd700`), CodeAreaStyle(`color: #da70d6`), CodeAreaStyle(`color: #179fff`)],
	invalid: CodeAreaStyle(`color: #d4d4d4; text-decoration: 1.5px #ff6060 wavy underline`)
}, patterns = {
	default: [
		/\/\/[^\n]*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment,
		/(if|else|while|for|with|of|in|return|throw|try|catch|finally|do|await|import|from|export|as|switch|case|default|typeof)(?![\w$])/y, styles.keyword,
		/"([^"\\\n]|\\[^])*("|(?=\n|$))|'([^'\\\n]|\\[^])*('|(?=\n|$))/y, styles.string,
		/(class|extends)(?![\w$])\s*/y, stack => (stack.push(patterns.type), styles.modifier),
		/(instanceof|new)(?![\w$])\s*/y, stack => (stack.push(patterns.type), styles.keyword),
		/"([^"\\]|\\.)*("|$)|'([^'\\]|\\.)*('|$)/y, styles.string,
		/`([^$`\\]|\\.|\$(?!{))*/y, stack => (stack.push(patterns.tstr), styles.string),
		/(-?Infinity|NaN|(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?)\w*/y, styles.number,
		/(async|let|const|var|function|class|this|null|true|false|undefined|get|set|static)(?![\w$])/y, styles.modifier,
		/[A-Z][\w$]+(?=\()|(?:(?:Ui|I)nt(?:8|16|32|64)Array|Float(32|64)Array|ArrayBuffer|DataView|Number|String|Boolean|BigInt|Object|Array|RegExp|Buffer|(?:Async)?(?:Generator)?Function|Symbol|Date|Promise|(?:Range|Type|Syntax|Eval|Aggregate|Reference|URI)?Error|URL|URLSearchParams|Map|Set|Iterator|WeakMap|WeakSet|FinalizationRegistry|Proxy|DOMException|AbortController|AbortSignal|Event|EventTarget|Text(?:En|De)coder|TransformStream(?:DefaultController)?|WritableStream(?:Default(?:Controller|Writer))?|ReadableStream(?:Default(?:Controller|Reader)|BYOBRe(?:ader|quest))?|ReadableByteStreamController|(?:ByteLength|Count)QueuingStrategy|Text(?:En|De)coderStream|(?:C|Dec)ompressionStream|BroadcastChannel|Message(?:Channel|Port|Event)|Blob|File|Performance(?:Entry|Mark|Measure|Observer(?:EntryList)?|ResourceTiming|FormData|Headers|Request|Response)?|WebSocket|SharedArrayBuffer|Navigator|Crypto(?:Key)?|SubtleCrypto|CustomEvent|Math|Atomics|WebAssembly|Reflect|Intl)(?!\w)/y, styles.type,
		/(?!\d)[\w$]+(?=\s*[(`])/y, styles.method,
		/[A-Z_][A-Z0-9_]+(?!\w)/y, styles.const,
		/#?(?!\d)[\w$]+/y, styles.identifier,
		/[{[(]/y, stack => (stack.push(patterns.default), styles.brackets[(stack.length-1)%styles.brackets.length]),
		/[}\])]/y, stack => (stack.pop(), styles.brackets[stack.length%styles.brackets.length]),
		/([!%^&*\-+=;:|<>,.?~\s]|\/(?![\*/]))+/y, styles.base,
		/(\r?\n\s*)+/y, null,
		styles.invalid
	],
	tstr: [
		/([^$`\\]|\\.|\$(?!{))+/y, styles.string,
		/\$\{/y, stack => (stack.push(patterns.default), styles.brackets[(stack.length-1)%styles.brackets.length]),
		/`/y, stack => (stack.pop(), styles.string)
	],
	type: [
		/(?=\W|if|else|while|for|with|of|in|return|throw|try|catch|finally|do|await|import|from|export|as|switch|case|default|typeof|class|extends|instanceof|new)/y, stack => (stack.pop(), null),
		/((?!\d)[\w$]+)/y, stack => (stack.pop(), styles.type),
	]
}
export default patterns.default