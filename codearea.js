{const styles = new Map(), sheet = new CSSStyleSheet(), gsheet = new CSSStyleSheet()
	gsheet.insertRule('code-area{user-select:none !important;-webkit-user-select:none !important;position:relative !important;tab-size:2;box-sizing:border-box !important;-webkit-tap-highlight-color:#0000 !important;font-size-adjust: none !important;touch-action: pan-y !important;display:block !important;white-space:pre-wrap !important;font-family:monospace;overflow-wrap:break-word}', 0)
	gsheet.insertRule('code-area:after{content:"" !important;height:0 !important;display:inline-block !important}', 1)
	gsheet.insertRule('code-area::-webkit-scrollbar{display: none;}',2)
	document.adoptedStyleSheets.push(gsheet)
	sheet.insertRule('textarea{z-index:1;position:absolute;padding:inherit;margin:0;top:0;left:0;width:100%;height:100%;border:none;outline:none;background:none;font:inherit;color:#0000;resize:none;caret-color:#888;line-height:inherit;white-space:pre-wrap;line-height:inherit;tab-size:inherit;box-sizing:border-box;-webkit-tap-highlight-color:#0000;font-size-adjust:none;touch-action:pan-y;overflow-wrap:inherit;overflow:clip}', 0)
	sheet.insertRule('::selection{background: #80808080}',1)
	sheet.insertRule('err:after{content:attr(data-c);background:#f00;color:white;position:absolute;left:0;width:13px;cursor:pointer;padding:0 2px;box-sizing:border-box;z-index:3}',2)
	sheet.insertRule('err:hover:after{content:attr(data-t);width:100%}',3)
	customElements.define('code-area', globalThis.CodeAreaElement = class CodeAreaElement extends HTMLElement{
		static observedAttributes = ['value', 'disabled']
		#patterns = new Map
		#defaultPattern = ''
		#textarea = document.createElement('textarea')
		#errors = []
		#codeScheduled = 0
		#os = 0; #oe = 0; #ol = 0
		#sh = null
		static #wMap = (document.addEventListener('selectionchange', e => {
			const el = CodeAreaElement.#wMap.get(e.target)
			if(el) el.#os = e.target.selectionStart, el.#oe = e.target.value.length-e.target.selectionEnd
		}), new WeakMap())
		compile = () => {
			if(this.#codeScheduled) return
			this.#codeScheduled = requestAnimationFrame(() => this.#code())
		}
		cancelCompile(){
			if(this.#codeScheduled < 0) return
			cancelAnimationFrame(this.#codeScheduled)
			this.#codeScheduled = 0
		}
		oncompile = null
		#makeError(err,c){
			const p = c?c.previousElementSibling:this.lastElementChild
			if(p && p.dataset.c){
				p.dataset.c = Math.min((+p.dataset.c||1) + 1,9)
				p.dataset.t += '\n'+err.trim()
				return
			}
			const n = document.createElement('err')
			n.dataset.c = '!'
			n.dataset.t = err.trim()
			this.#sh.insertBefore(n, c)
			this.#errors.push(n)
		}
		errors(errors){
			const v = this.#textarea.value.split('\n')
			const arr = []
			let c = 0, j = 0; for(const l of v) arr.push(c),c+=l.length+1
			c = 0; const ch = this.#sh.children
			for(const {0:line,1:msg} of errors){
				const idx = arr[line-1]
				let L = ch[j].textContent.length
				while(j<ch.length-1&&c+L<=idx) c+=L,L=ch[++j].textContent.length
				this.#makeError(msg, ch[j])
			}
		}
		#code(){
			for(const e of this.#errors) e.remove()
			this.#errors.length = 0
			this.#codeScheduled = 0
			this.oncompile?.call(this, this.#textarea.value)
		}
		get disabled(){ return this.#textarea.disabled }
		set disabled(a){ this.#textarea.disabled = a }
		get value(){ return this.#textarea.value }
		set value(a){
			this.#textarea.value = a
			if(this.#sh) this.#textarea.oninput()
			this.compile()
		}
		constructor() {
			super()
			this.#textarea.spellcheck = false
			this.#textarea.onchange = this.compile
			this.#textarea.onkeydown = ev => {
				if(ev.keyCode === 13 && ev.shiftKey){ if(!this.#codeScheduled) this.#code() }
				else if(ev.keyCode === 9){
					const s = this.#textarea.selectionStart, e = this.#textarea.selectionEnd, v = this.#textarea.value
					if(s === e){
						this.#textarea.value = v.slice(0, s)+'\t'+v.slice(s)
						this.#textarea.selectionStart = this.#textarea.selectionEnd = s+1
					}else{
						if(ev.shiftKey) this.#textarea.value = v.slice(0, s)+v.slice(s,e).replace(/\n\t/g,'\n')+v.slice(e)
						else this.#textarea.value = v.slice(0, s)+v.slice(s,e).replace(/\n/g,'\n\t')+v.slice(e)
						this.#textarea.selectionStart = s; this.#textarea.selectionEnd = e+this.#textarea.value.length-v.length
					}
					this.#textarea.oninput()
				}else return
				ev.preventDefault()
			}
			CodeAreaElement.#wMap.set(this.#textarea, this)
			this.#textarea.oninput = () => {
				const v = this.#textarea.value
				let i = Math.min(this.#os, this.#os = this.#textarea.selectionStart)
				let e = 0, j = 1, l = 0
				const ch = this.#sh.children, count = ch.length
				let state = this.#defaultPattern
				// Allows one token of lookahead leniency for regexes
				for(;j<count;j++){
					const t = ch[j].textContent
					if((e += t.length) <= i){ l=t.length; continue }
					i = e-t.length-l
					if(j>1) state = ch[--j].state
					break
				}
				if(j==count) i -= l,j>1&&(state=ch[--j].state)
				l = Math.min(this.#oe, this.#oe = v.length-this.#textarea.selectionEnd)
				e = this.#ol-l-i; l = (this.#ol = v.length)-l-i
				while(e > 0){
					e -= ch[j].textContent.length
					ch[j].remove()
				}
				l = e-l
				let inv = 0, pat = this.#patterns.get(state) || ['']
				t: while(i+inv < v.length){
					for(let q = 1; q < pat.length; q+=3){
						const r = pat[q]
						r.lastIndex = i+inv
						if(!r.test(v)) continue
						const len = r.lastIndex-i
						l += len
						let c = ch[j]
						while(c && l > 0){
							l -= c.textContent.length
							c.remove()
							c = ch[j]
						}
						if(inv){
							const n = document.createElement('span')
							if(pat[0]) n.classList.add(pat[0])
							n.state = state
							n.textContent = v.slice(i, i+inv)
							this.#sh.insertBefore(n, c); j++
						}
						const n = document.createElement('span'), k = pat[q+1]
						if(k) n.classList.add(k)
						n.state = state
						n.textContent = v.slice(i+inv, i += len)
						this.#sh.insertBefore(n, c); j++
						const s = pat[q+2]
						if(typeof s == 'string') pat = this.#patterns.get(state = s)
						inv = 0
						if(!l&&(!c||state==c.state)) return
						continue t
					}
					inv++
				}
				while(j<ch.length) ch[j].remove()
				if(i<v.length){
					const n = document.createElement('span')
					n.textContent = v.slice(i)
					this.#sh.append(n)
				}
			}
		}
		attributeChangedCallback(n, _, v){
			if(n == 'disabled') this.disabled = v!=null
			else if(n == 'value') this.value = v
		}
		connectedCallback(){
			this.#sh = this.attachShadow({mode: 'closed'})
			this.#sh.adoptedStyleSheets.push(sheet)
			this.#sh.appendChild(this.#textarea)
			this.#textarea.oninput()
			this.compile()
		}
		disconnectedCallback(){
			this.#sh.remove()
			this.#sh = null
		}
		setPatterns(obj, def = 'default'){
			this.#patterns.clear()
			this.#defaultPattern = def
			if(Array.isArray(obj)) obj = {default: obj}
			else if(!obj) return
			this.#patterns.set(def, [''])
			let toParse = [def]
			while(toParse.length){ const n = toParse; toParse = []; for(const s of n){
				const arr = this.#patterns.get(s)
				if(!obj[s]){this.#patterns.clear(); throw new TypeError('Undefined semantic state \''+s+'\'')}
				for(const e of obj[s]){
					if(typeof e == 'string' || !e[0]){
						let cl = typeof e == 'string' ?
						e[0] == '.' ? e.slice(1) : styles.get(e)
						: typeof e == 'object' && e ? styleToStr(e) : ''
						if(cl === undefined) styles.set(e, cl = 'c'+styles.size), sheet.insertRule(`.${cl}{${e}}`, 4)
						arr[0] = cl
						continue
					}
					let {0: regex, 1: style, 2: setState} = e
					if(typeof setState == 'string' && !this.#patterns.has(setState)) toParse.push(setState), this.#patterns.set(setState, [''])
					if(typeof regex == 'string') regex = new RegExp(regex, 'y')
					if(!regex.flags.includes('y')) regex = new RegExp(regex.source, regex.flags+'y')
					let cl = typeof style == 'string' ?
						style[0] == '.' ? style.slice(1) : styles.get(style)
					: typeof style == 'object' && e ? styleToStr(style) : ''
					if(cl === undefined) styles.set(style, cl = 'c'+styles.size), sheet.insertRule(`.${cl}{${style}}`, 4)
					arr.push(regex, cl, setState)
				}
			} }
			if(this.#sh) this.#textarea.oninput()
		}
	})
	let n; function styleToStr(s){
		n = n||document.createElement('p')
		Object.assign(n.style, s)
		return (s=n.getAttribute('style'),n.style='',s)
	}}