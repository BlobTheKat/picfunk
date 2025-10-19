const styles = {
	types: CodeAreaStyle(`color: #e52`),
	storage: CodeAreaStyle(`color: #f45`),
	keyword: CodeAreaStyle(`color: #e39`),
	macro: CodeAreaStyle(`color: #e39; font-style: italic`),
	int: CodeAreaStyle(`color: #46f`),
	str: CodeAreaStyle(`color: #73f`),
	id: CodeAreaStyle(`color: #ccc`),
	symbols: CodeAreaStyle(`color: #fff`),
	symbols2: CodeAreaStyle(`color: #999`),
	comment: CodeAreaStyle(`color: #555`)
}

const macro = [
	/[^\n]/y, CodeAreaStyle(`color: #a16; font-style: italic`),
	/(?:)/y, stack => (stack[stack.length-1] = def, null),
]

const def = [
	/\/\/.*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment,
	/(^|\n)\s*#(\w+|!)/y, stack => (stack[stack.length-1] = macro, styles.macro),
	/(true|false)(?!\w)|(\d+[bsilxBSILX]?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|(\d+\.\d*|\.\d+)(e[+-]?\d*)?[hfdHFD]?)(?![\.\w])/yi, styles.int,
	/`([^`\\]|\\[^])*(`|$)|"([^"\\]|\\[^])*("|$)|'([^'\\]|\\.)/yi, styles.str,
	/([A-Z][a-zA-Z0-9_]*|void|char|(?:bool|u?(byte|short|int|x?long)|[ui]size|h?float|double)[234]?)(?!\w)/y, styles.types,
	/(if|else|while|for|const|union|struct|return|break|continue|goto|do|while|switch|case|default|sizeof|alignof|swizzle)(?!\w)/y, styles.keyword,
	/[()[\]!%^&*:<>,/?|~\-=+]+/y, styles.symbols,
	/[;.{}]/y, styles.symbols2,
	/\w+/y, styles.id,
]

export default def