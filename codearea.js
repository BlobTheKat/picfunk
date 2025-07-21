{
	const styles = new Map(), sheet = new CSSStyleSheet(), gsheet = new CSSStyleSheet()
	gsheet.insertRule('code-area{user-select:none !important;-webkit-user-select:none !important;position:relative !important;tab-size:2;box-sizing:border-box !important;-webkit-tap-highlight-color:#0000 !important;text-size-adjust: none !important;-webkit-text-size-adjust: none !important;touch-action: pan-y !important;display:grid !important;white-space:pre-wrap !important;font-family:monospace;overflow-wrap:break-word;overflow:auto !important;line-height:1.2;scrollbar-width:0;--max-line-width:100%;grid-template-columns:minmax(auto,var(--max-line-width));--min-gutter:0}', 0)
	gsheet.insertRule('code-area::-webkit-scrollbar{display: none}', 1)
	document.adoptedStyleSheets.push(gsheet)
	sheet.insertRule('textarea{z-index:1;padding:0;padding-left:max(1ch,var(--min-gutter) * 1ch);margin:0;inset:0;border:none;outline:none;background:none;font:inherit;color:#0000;resize:none;caret-color:#999;white-space:pre-wrap;tab-size:inherit;box-sizing:border-box;-webkit-tap-highlight-color:#0000;text-size-adjust: none;-webkit-text-size-adjust: none;touch-action:pan-y;overflow-wrap:inherit;overflow:clip;grid-area:1/1}', 0)
	sheet.insertRule('textarea::selection{background: Highlight}',1)
	sheet.insertRule('div{min-height:1lh;counter-increment:l}',2)
	sheet.insertRule('label{box-sizing:border-box;position:absolute;left:0;width:calc(var(--g) + 0.25lh);display:block;white-space:pre;color:#808080;padding-right:0.25lh;clip-path:polygon(0 0, calc(100% - 0.25lh) 0, 100% 50%, calc(100% - 0.25lh) 100%, 0 100%);z-index:2;cursor:pointer}',3)
	sheet.insertRule('label::before{content:counter(l);display:inline-block;width:var(--g);text-align:right}',4)
	sheet.insertRule('main{grid-area:1/1;--g:max(1ch,var(--min-gutter) * 1ch);padding-left:var(--g)}',5)
	sheet.insertRule('label[data-message]:hover::after{content:attr(data-message);display:inline-block;padding-left:0.5lh;white-space:pre-wrap;vertical-align:top;width:calc(100% - var(--g) - 0.25lh)}',6)
	sheet.insertRule('label[data-message]:hover{width:100%;z-index:3;padding:var(--hover-padding)}',7)
	const p = document.createElement('p')
	globalThis.CodeAreaStyle = s => {
		if(typeof s == 'object') Object.assign(p.style, s), s = p.getAttribute('style'), p.style=''
		if(s[0] == '.') return s
		let cl = styles.get(s)
		if(cl === undefined) styles.set(s, cl = Symbol.for('c'+styles.size)), sheet.insertRule(`.${cl.description}{${s}}`, styles.size+2)
		return cl
	}
	customElements.define('code-area', globalThis.CodeAreaElement = class CodeAreaElement extends HTMLElement{
		static observedAttributes = ['value', 'disabled']
		#basePattern = []
		#lineStyle = ''; #lineStyle2 = null
		#firstLine = 1
		get firstLine(){ return this.#firstLine }
		set firstLine(a){
			this.#firstLine = Math.floor(+a || 0)
			this.#el.style.counterReset = 'l '+(this.#firstLine-1)
		}
		get visibleLineCount(){ return this.#el.childNodes.length }
		get defaultLineStyle(){ return this.#lineStyle2 }
		set defaultLineStyle(cl){
			const old = this.#lineStyle
			this.#lineStyle = cl = (this.#lineStyle2 = typeof cl == 'symbol' ? cl : null) ? cl.description : ''
			if(cl == old) return
			for(const n of this.#el.childNodes){
				const c = n.firstChild.classList
				old ? cl ? c.replace(old, cl) : c.remove(old) : cl && c.add(cl)
			}
		}
		setLineStyle(line, style = null, message = null){
			style = typeof style == 'symbol' ? style.description : this.#lineStyle
			const el = this.#el.childNodes[line - this.#firstLine]?.firstChild
			if(el){
				el.className = style, typeof message == 'string' ? el.dataset.message = message : delete el.dataset.message
				return true
			}
			return false
		}
		resetAllLineStyles(){
			const ch = this.#el.childNodes
			for(let i = ch.length-1; i >= 0; i--){
				const el = ch[i].firstChild
				el.className = this.#lineStyle, typeof message == 'string' ? el.dataset.message = message : delete el.dataset.message
			}
		}
		getLineStyle(line = 0){
			const cl = this.#el.childNodes[line - this.#firstLine]?.firstChild.classList
			if(!cl || !cl.length) return null
			return Symbol.for(cl[0])
		}
		getLineMessage(line = 1){
			const el = this.#el.childNodes[line - this.#firstLine]?.firstChild
			if(!el) return null
			return el.dataset.message ?? null
		}
		onlineclick = null
		get basePattern(){ return this.#basePattern }
		set basePattern(a){
			this.#basePattern = Array.isArray(a) ? a : []
			this.rehighlight()
		}
		#sh = this.attachShadow({mode: 'closed'})
		#el = document.createElement('main')
		#textarea = document.createElement('textarea')
		#codeScheduled = 0
		#rhScheduled = 0
		#os = 0; #oe = 0; #ol = 0
		static #_ = (document.addEventListener('selectionchange', () => {
			const el = document.activeElement
			if(!(el instanceof CodeAreaElement)) return
			if(el) el.#os = el.#textarea.selectionStart, el.#oe = el.#textarea.value.length-el.#textarea.selectionEnd
		}))
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
		#code(){
			this.#codeScheduled = 0
			this.oncompile?.call(this, this.#textarea.value)
		}
		get disabled(){ return this.#textarea.disabled }
		set disabled(a){ this.#textarea.disabled = a }
		get value(){ return this.#textarea.value }
		set value(a){
			this.#textarea.value = a
			this.rehighlight()
			this.compile()
		}
		get selectionStart(){ return this.#textarea.selectionStart }
		get selectionEnd(){ return this.#textarea.selectionEnd }
		set selectionStart(a){ this.#textarea.selectionStart = a }
		set selectionEnd(a){ this.#textarea.selectionEnd = a }
		constructor() {
			super()
			this.#sh.adoptedStyleSheets.push(sheet)
			this.#sh.appendChild(this.#el)
			this.#el.setAttribute('inert','')
			this.#sh.append(this.#textarea)
			this.#textarea.spellcheck = false
			this.#textarea.onchange = this.compile
			this.#textarea.onkeydown = ev => {
				if(ev.keyCode === 13 && ev.shiftKey){ if(!this.#codeScheduled) this.#code(); return false }
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
					return false
				}
			}
			this.#textarea.oninput = ev => {
				if(this.#rhScheduled){
					if(typeof ev == 'number') this.#rhScheduled = 0
					else return
				}
				const v = this.#textarea.value
				let i = Math.min(this.#os, this.#os = this.#textarea.selectionStart)
				let e = 0, j = 0, k = 2, l = 0
				const ch = this.#el.children, count = ch.length-1
				let el = ch[0], ch2
				let state = null, sl = 0, sz = null
				const setState = () => {
					if(!stack.length){ stack.push(state); return }
					if(state == (state = stack[stack.length-1])) return
					sl = state.length-1, sz = state.length&1 ? state[sl] : null
				}
				let stack = null
				// Allows one token of lookahead leniency for regexes
				if(count<0){
					const el2 = el = document.createElement('div')
					const lab = document.createElement('label')
					if(this.#lineStyle) lab.classList.add(this.#lineStyle)
					el2.append(lab, '')
					el2.stack = stack = [this.#basePattern]
					i = el2.l = 0
					ch2 = el2.childNodes
					this.#el.appendChild(el2)
				}else for(;j<=count;j++){
					el = ch[j]; let l1 = el.l+(j==count)
					if((e += l1) <= i) continue
					e -= l1
					ch2 = el.childNodes; let len = ch2.length-1
					if(len > 1 && e + ch2[2].l >= i && j) do{
						// prev token will be on prev line!
						l1 = (el = ch[--j]).l, e -= l1, ch2 = el.childNodes, len = ch2.length-1
					}while(len < 2 && j)
					stack = el.stack.slice()
					let otok = null, l2 = 0; k = 2
					if(len>1) for(;;){
						const tok = ch2[k], l = tok.l
						if(k == len || (e + l) > i) break
						e += l2 = l
						if(otok?.f){
							let t = otok.textContent
							if(k == len){
								let j2 = j, el2
								do el2 = ch[++j2].childNodes, t += '\n', t += el2[1].textContent
								while(el2.length <= 2)
							}
							otok.f(stack, t)
						}
						otok = tok; k++
					}
					i = e
					if(k > 2) i -= l2, k--
					break
				}
				setState()
				l = Math.min(this.#oe, this.#oe = v.length-this.#textarea.selectionEnd)
				e = l; l = this.#ol-e-i; e = (this.#ol = v.length)-e-i
				let tok = ch2[k]
				const stack2 = stack.slice()
				const addToken = (t, style) => {
					let f = null
					if(typeof style == 'function') style = (f = style)(stack, t), setState()
					let ts = t, idx = t.indexOf('\n'), n, l = t.length
					if(idx >= 0) ts = t.slice(0, idx), t = t.slice(idx+1)
					if(!style) n = ts ? document.createTextNode(ts) : document.createComment("")
					else{
						n = document.createElement('span')
						n.append(ts)
						if(typeof style == 'symbol') n.classList.add(style.description)
						else if(typeof style == 'string') n.style = style
						else if(typeof style == 'object') Object.assign(n.style, style)
					}
					n.l = l; n.f = f; el.l += l
					el.insertBefore(n, tok); k++
					while(idx >= 0){
						idx = t.indexOf('\n')
						if(idx >= 0) ts = t.slice(0, idx), t = t.slice(idx+1)
						else ts = t, l = -1
						if(!style) n = ts ? document.createTextNode(ts) : document.createComment("")
						else{
							n = document.createElement('span')
							n.append(ts)
							if(typeof style == 'symbol') n.classList.add(style.description)
							else if(typeof style == 'string') n.style = style
							else if(typeof style == 'object') Object.assign(n.style, style)
						}
						const el2 = document.createElement('div')
						const lab = document.createElement('label')
						if(this.#lineStyle) lab.classList.add(this.#lineStyle)
						el2.append(lab, n)
						let l1 = 0
						this.#el.insertBefore(el2, el.nextSibling)
						while(ch2.length > k){ const n = ch2[k]; el2.append(n); l1 += n.l; el.l -= n.l }
						el2.stack = stack.slice(); el2.l = l1
						ch2 = (el = el2).childNodes
						tok = ch2[k = 2]; j++
					}
				}
				const remTokens = () => { while(tok && l > 0){
					el.l -= tok.l; l -= tok.l; tok.remove()
					let t = tok.textContent, f = tok.f
					if(k == ch2.length){
						let el2
						while(el2 = ch[j+1]){
							el2.remove()
							if(f) t += '\n', t += el2.childNodes[1].textContent
							if(el2.childNodes.length > 2) break
						}
						if(el2){
							const ch3 = el2.childNodes
							while(ch3.length > 2){ const n = ch3[2]; el.append(n); el.l += n.l }
						}
					}
					if(f) f(stack2, t)
					tok = ch2[k]
				} }
				remTokens()
				l -= e; let inv = 0
				t: while(i+inv < v.length){
					for(let q = 0; q < sl; q+=2){
						const r = state[q]
						r.lastIndex = i+inv
						if(!r.test(v)) continue
						const len = r.lastIndex-i
						if(!len && !r.flags.includes('y')){ console.error("Regex %s doesn't have the y flag", r); continue }
						l += len
						if(inv) addToken(v.slice(i, i+inv), sz)
						addToken(v.slice(i+inv, i += len), state[q+1])
						remTokens()
						inv = 0
						a: if(!l){
							const l = stack.length
							if(l != stack2.length) break a
							for(let i = l-1; i >= 0; i--) if(stack[i] != stack2[i]) break a
							const w = Math.floor(Math.log10(ch.length))+1.5
							this.#el.style.setProperty('--g', this.#textarea.style.paddingLeft = `max(var(--min-gutter) * 1ch,${w}ch)`)
							return
						}
						continue t
					}
					inv++
				}
				l += inv
				remTokens()
				if(i<v.length) addToken(v.slice(i), sz)
				const w = Math.floor(Math.log10(ch.length))+1.5
				this.#el.style.setProperty('--g', this.#textarea.style.paddingLeft = `max(var(--min-gutter) * 1ch,${w}ch)`)
			}
			this.#el.onclick = ev => {
				const target = ev.composedPath()[0]
				if(!(target instanceof HTMLLabelElement)) return
				const ch = this.#el.childNodes, l = ch.length
				for(let i = 0; i < l; i++) if(ch[i].firstChild == target){
					this.onlineclick?.(i+this.#firstLine, this)
					break
				}
				return false
			}
		}
		attributeChangedCallback(n, _, v){
			if(n == 'disabled') this.disabled = v != null
			else if(n == 'value') this.value = v
		}
		rehighlight(){
			if(this.#rhScheduled) return
			this.#os = this.#oe = 0
			const ch = this.#el.children; let l = ch.length
			while(l > 1) ch[--l].remove()
			this.#rhScheduled = requestAnimationFrame(this.#textarea.oninput)
		}
		/*setPattern(list){
			if(def === undefined) obj = {'': obj}, def=''
			let toParse = [def]
			const seen = new Map(), seen2 = new Map
			seen.set(def, this.#pattern = [''])
			while(toParse.length){ const n = toParse; toParse = []; for(const s of n){
				if(!Object.hasOwn(obj, def)){ this.#pattern = ['']; throw new TypeError('Undefined semantic state \''+s+'\'') }
				const arr = seen.get(s), a2 = obj[s]
				for(let i = 0; i < a2.le e of obj[s]){
					if(typeof e == 'string'){
						let cl = e[0] == '.' ? e.slice(1) : styles.get(e)
						if(cl === undefined) styles.set(e, cl = 'c'+styles.size), sheet.insertRule(`.${cl}{${e}}`, 4)
						arr[0] = cl
						continue
					}
					const cache = seen2.get(e)
					if(cache){ arr.push(cache.a, cache.b, cache.c); continue }
					let {0: regex, 1: style} = e, setState = arr
					if(e.length > 2){
						const push = [0]
						for(let i = 2; i < e.length; i++){
							let n = e[i]
							if(typeof n == 'number'){
								n >>>= 0
								if(n < push.length) push.length -= n
								else push[0] += n-push.length+1, push.length = 1
								continue
							}else if(n == null){ push.push(null); continue }
							let a2 = seen.get(n)
							if(!a2){
								seen.set(n, a2 = [''])
								toParse.push(n)
							}
							push.push(a2)
						}
						setState = push.length == 2 && !push[0] ? push[1] : push
					}
					if(typeof regex == 'string') regex = new RegExp(regex, 'y')
					if(!regex.flags.includes('y')) regex = new RegExp(regex.source, regex.flags+'y')
					let cl = style[0] == '.' ? style.slice(1) : styles.get(style)
					if(cl === undefined) styles.set(style, cl = 'c'+styles.size), sheet.insertRule(`.${cl}{${style}}`, 4)
					seen2.set(e, {a: regex, b: cl, c: setState})
					arr.push(regex, cl, setState)
				}
			} }
			
		}*/
	})}