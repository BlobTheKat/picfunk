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
	label: CodeAreaStyle(`color: #c8c8c8`),
	brackets: [CodeAreaStyle(`color: #ffd700`), CodeAreaStyle(`color: #da70d6`), CodeAreaStyle(`color: #179fff`)],
	regexp: CodeAreaStyle(`color: #d16969`),
	invalid: CodeAreaStyle(`color: #d4d4d4; text-decoration: 1.5px #ff6060 wavy underline`)
}, patterns = {
	expectBraces: [
		/\/\/[^\n]*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment,
		'\v\f\t\r\n ', null,
		'(', stack => (stack.push(patterns.expectBlock, patterns.expectExpression), styles.brackets[(stack.length-1)%styles.brackets.length]),
		null, stack => (stack[stack.length-1] = patterns.default, null),
	],
	default: [
		/\/\/[^\n]*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment,
		/(if|else|while|for|with|try|catch|finally|do|import|from|export|as|switch|case|default|break|continue)(?![\p{ID_Continue}_$])/yu, stack => (stack[stack.length-1] = patterns.expectBraces, styles.keyword),
		/(return|throw|await)(?![\p{ID_Continue}_$])/yu, stack => (stack.push(patterns.expectExpression), styles.keyword),
		/(async|let|const|var|function|this|super|null|true|false|undefined)(?![\p{ID_Continue}_$])/yu, styles.modifier,
		/[\p{ID_Start}_$][\p{ID_Continue}_$]*\s*:/yu, styles.label,
		/{/y, stack => (stack.push(patterns.default), styles.brackets[(stack.length-1)%styles.brackets.length]),
		/}/y, stack => (stack.pop(), styles.brackets[stack.length%styles.brackets.length]),
		/[!+\-~]/y, stack => (stack.push(patterns.expectExpression), styles.base),
		/\s+/y, null,
		/[[(]?/y, (stack, t) => (stack.push(patterns.expectExpression), t ? styles.brackets[(stack.length-1)%styles.brackets.length] : null),
		styles.invalid
	],
	// used for correctly matching regex and objects
	expectExpression: [
		/\/\/[^\n]*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment, '\v\f\t ', null,
		/\p{Uppercase_Letter}[\p{ID_Continue}_$]*(?=\()|(?:(?:Ui|I)nt(?:8|16|32|64)Array|Float(32|64)Array|ArrayBuffer|DataView|Number|String|Boolean|BigInt|Object|Array|RegExp|Buffer|(?:Async)?(?:Generator)?Function|Symbol|Date|Promise|(?:Range|Type|Syntax|Eval|Aggregate|Reference|URI)?Error|URL|URLSearchParams|Map|Set|Iterator|WeakMap|WeakSet|FinalizationRegistry|Proxy|DOMException|AbortController|AbortSignal|Event|EventTarget|Text(?:En|De)coder|TransformStream(?:DefaultController)?|WritableStream(?:Default(?:Controller|Writer))?|ReadableStream(?:Default(?:Controller|Reader)|BYOBRe(?:ader|quest))?|ReadableByteStreamController|(?:ByteLength|Count)QueuingStrategy|Text(?:En|De)coderStream|(?:C|Dec)ompressionStream|BroadcastChannel|Message(?:Channel|Port|Event)|Blob|File|Performance(?:Entry|Mark|Measure|Observer(?:EntryList)?|ResourceTiming|FormData|Headers|Request|Response)?|WebSocket|SharedArrayBuffer|Navigator|Crypto(?:Key)?|SubtleCrypto|CustomEvent|Math|Atomics|WebAssembly|Reflect|Intl)(?![\p{ID_Continue}_$])/yu, stack => (stack[stack.length-1] = patterns.afterExpression, styles.type),
		/"([^"\\]|\\.)*("|$)|'([^'\\]|\\.)*('|$)/y, stack => (stack[stack.length-1] = patterns.afterExpression, styles.string),
		/`([^$`\\]|\\.|\$(?!{))*/y, stack => (stack[stack.length-1] = patterns.afterExpression, stack.push(patterns.tstr), styles.string),
		/(-?Infinity|NaN|(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?)[\p{ID_Continue}_$]*/yu, stack => (stack[stack.length-1] = patterns.afterExpression, styles.number),
		'{', stack => (stack[stack.length-1] = patterns.afterExpression, stack.push(patterns.object), styles.brackets[(stack.length-1)%styles.brackets.length]),
		/\/[^\/\r\n]+(\/[a-zA-Z]*|(?=[\r\n]|$))/y, stack => (stack[stack.length-1] = patterns.afterExpression, styles.regexp),
		/new(?![\p{ID_Continue}_$])\s*/yu, stack => (stack[stack.length-1] = patterns.afterExpression, stack.push(patterns.type), styles.keyword),
		/(class|extends)(?![\p{ID_Continue}_$])\s*/yu, stack => (stack.push(patterns.type), styles.modifier),
		/\+\+|--/y, styles.base,
		/(typeof|delete|var|let|const)(?![\p{ID_Continue}_$])/yu, styles.modifier,
		/(this|super|null|true|false|undefined)(?![\p{ID_Continue}_$])/yu, styles.modifier,
		/#?[\p{ID_Start}_$][\p{ID_Continue}_$]*(?=\s*[(`])/yu, stack => (stack[stack.length-1] = patterns.afterExpression, styles.method),
		/[A-Z_][A-Z0-9_]+(?![\p{ID_Continue}_$])/yu, stack => (stack[stack.length-1] = patterns.afterExpression, styles.const),
		/#?[\p{ID_Start}_$][\p{ID_Continue}_$]*/yu, stack => (stack[stack.length-1] = patterns.afterExpression, styles.identifier),
		/[\(\[]/y, stack => (stack[stack.length-1] = patterns.afterExpression, stack.push(patterns.expectExpression), styles.brackets[(stack.length-1)%styles.brackets.length]),
		'])', stack => (stack.pop(), styles.brackets[stack.length%styles.brackets.length]),
		null, stack => (stack[stack.length-1] = patterns.afterExpression, null),
	],
	afterExpression: [
		/\/\/[^\n]*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment, '\v\f\t ', null,
		/\+\+|--/y, styles.base,
		/(of|in)(?![\p{ID_Continue}_$])/yu, stack => (stack[stack.length-1] = patterns.expectExpression, styles.keyword),
		/[\(\[]/y, stack => (stack.push(patterns.expectExpression), styles.brackets[(stack.length-1)%styles.brackets.length]),
		/[\)\]]/y, stack => (stack.pop(),styles.brackets[stack.length%styles.brackets.length]),
		/`([^$`\\]|\\.|\$(?!{))*/y, stack => (stack.push(patterns.tstr), styles.string),
		/(?=})/y, stack => (stack[stack.length-2] == patterns.tstr ? stack[stack.length-1] = patterns.tstr2 : stack.pop(), null),
		';\r\n', (stack, t) => stack[stack.length-2] == patterns.default || stack[stack.length-2] == patterns.object ? (stack.pop(), styles.base) : t==';' ? styles.invalid : styles.base,
		',', (stack, t) => stack[stack.length-2] == patterns.object ? (stack.pop(), styles.base) : (stack[stack.length-1] = patterns.expectExpression, styles.base),
		/=>/y, stack => (stack[stack.length-1] = patterns.expectExpression, stack.push(patterns.expectBlock), styles.modifier),
		/([*|&=!?])\1=?|[+\-\/%^<>*]=?|[!~?:=.]/y, stack => (stack[stack.length-1] = patterns.expectExpression, styles.base),
		/instanceof(?![\p{ID_Continue}_$])\s*/yu, stack => (stack[stack.length-1] = patterns.type, styles.keyword),
		/(?={)/y, stack => stack[stack.length-2] == patterns.default || stack[stack.length-2] == patterns.object ? (stack.pop(), null) : (stack.push(patterns.invalid1), null),
		/[^]/y, stack => (stack[stack.length-1] = patterns.expectExpression, styles.invalid),
	],
	invalid1: [
		/[^]/y, stack => (stack.pop(), styles.invalid)
	],
	object: [
		/\/\/[^\n]*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment, '\v\f\t ', null,
		/(static|get|set|async)(?![\p{ID_Continue}_$])/yu, styles.modifier,
		/\*?#?[\p{ID_Start}_$][\p{ID_Continue}_$]*(?=\s*[(`])/yu, styles.method,
		/[A-Z_][A-Z0-9_]+(?![\p{ID_Continue}_$])/yu, styles.const,
		/#?[\p{ID_Start}_$][\p{ID_Continue}_$]*/yu, styles.identifier,
		/((\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?)[\p{ID_Continue}_$]*/yu, styles.number,
		'[', stack => (stack.push(patterns.expectExpression), styles.brackets[(stack.length-1)%styles.brackets.length]),
		'(', stack => (stack.push(patterns.expectBlock, patterns.expectExpression), styles.brackets[(stack.length-1)%styles.brackets.length]),
		'}', stack => (stack.pop(), styles.brackets[stack.length%styles.brackets.length]),
		':=', stack => (stack.push(patterns.expectExpression), styles.base),
		',;', styles.base
	],
	expectBlock: [
		/\/\/[^\n]*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment,
		'\v\f\t\r\n ', null,
		'{', stack => (stack[stack.length-1] = patterns.default, styles.brackets[(stack.length-1)%styles.brackets.length]),
		null, stack => (stack.pop(), null),
	],
	tstr: [
		/([^$`\\]|\\.|\$(?!{))+/y, styles.string,
		/\$\{/y, stack => (stack.push(patterns.expectExpression), styles.brackets[(stack.length-1)%styles.brackets.length]),
		/`/y, stack => (stack.pop(), styles.string)
	],
	tstr2: [
		'}', stack => (stack.pop(), styles.brackets[stack.length%styles.brackets.length])
	],
	type: [
		/\/\/[^\n]*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment, '\v\f\t ', null,
		/(?!extends)([\p{ID_Start}_$][\p{ID_Continue}_$]*)/yu, stack => (stack.pop(), styles.type),
		null, stack => (stack.pop(), null)
	]
}
export default patterns.default