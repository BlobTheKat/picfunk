const styles = {
	types: CodeAreaStyle(`color: #e52`),
	storage: CodeAreaStyle(`color: #f45`),
	keyword: CodeAreaStyle(`color: #e39`),
	macro: CodeAreaStyle(`color: #e39; font-style: italic`),
	int: CodeAreaStyle(`color: #46f`),
	float: CodeAreaStyle(`color: #73f`),
	id: CodeAreaStyle(`color: #ccc`),
	symbols: CodeAreaStyle(`color: #fff`),
	symbols2: CodeAreaStyle(`color: #999`),
	comment: CodeAreaStyle(`color: #555`)
}

const macro = [
	/(?=\n)/y, stack => (stack[stack.length-1] = def, null),
	CodeAreaStyle(`color: #a16; font-style: italic`)
]

const def = [
	/\/\/.*|\/\*([^*]|\*(?!\/))*(\*\/|$)/y, styles.comment,
	/(^|\n)\s*#\w+/y, stack => (stack[stack.length-1] = macro, styles.macro),
	/(\d+|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)[iu]?(?![\.\w])/yi, styles.int,
	/(\d+\.\d*|\.\d+)(e\d+)?f?/yi, styles.float,
	/gl_\w+|__\w+|(?:union|common|partition|active|asm|class|union|enum|typedef|template|this|packed|goto|inline|noinline|volatile|public|static|extern|external|interface|unsigned|input|output)(?!\w)/y, styles.invalid,
	/([uib]?vec[234]|mat[234](x[234])?|float|u?int|u?sampler[23]D|void|bool)(?!\w)/y, styles.types,
	/(if|else|while|for|discard|return|break|continue|do|while|switch|case|default)(?!\w)/y, styles.keyword,
	/(precision|lowp|mediump|highp|const|in|out|inout|uniform|struct)(?!\w)/y, styles.storage,
	/[()[\]!%^&*:<>,/?|~\-=+]+/y, styles.symbols,
	/[;.{}]/y, styles.symbols2,
	/\w+/y, styles.id,
]

export default def