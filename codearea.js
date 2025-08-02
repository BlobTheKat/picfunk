{
	const SAFARI = CSS.supports('-webkit-backdrop-filter', 'none')
	const styles = new Map(), sheet = new CSSStyleSheet(), gsheet = new CSSStyleSheet()
	gsheet.insertRule(`code-area{user-select:none !important;-webkit-user-select:none !important;position:relative !important;tab-size:2;box-sizing:border-box !important;-webkit-tap-highlight-color:#0000 !important;text-size-adjust: none !important;-webkit-text-size-adjust: none !important;touch-action: pan-y !important;display:grid !important;white-space:pre-wrap !important;font-family:monospace;overflow:auto !important;overflow-wrap:break-word !important;word-wrap:break-word !important;line-height:1.2;scrollbar-width:0;--max-line-width:100%;grid-template-columns:minmax(auto,var(--max-line-width));--min-gutter:0}`, 0)
	gsheet.insertRule('code-area::-webkit-scrollbar{display: none}', 1)
	document.adoptedStyleSheets.push(gsheet)
	sheet.insertRule('textarea{z-index:1;padding:0;padding-left:max(1ch,var(--min-gutter) * 1ch);margin:0;inset:0;border:none;outline:none;background:none;font:inherit;color:#0000;resize:none;caret-color:#999;white-space:pre-wrap;tab-size:inherit;box-sizing:border-box;-webkit-tap-highlight-color:#0000;text-size-adjust: none;-webkit-text-size-adjust: none;overflow-wrap:inherit;word-wrap:inherit;touch-action:pan-y;overflow:clip;grid-area:1/1}', 0)
	sheet.insertRule('textarea::selection{background: Highlight}',1)
	sheet.insertRule('div{min-height:1lh}',2)
	sheet.insertRule('label{box-sizing:border-box;position:absolute;left:0;width:calc(var(--g) + 0.25lh);display:block;white-space:pre;color:#808080;padding-right:0.25lh;clip-path:polygon(0 0, calc(100% - 0.25lh) 0, 100% 50%, calc(100% - 0.25lh) 100%, 0 100%);z-index:2;cursor:pointer;counter-increment:l}',3)
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
		static observedAttributes = (document.addEventListener('selectionchange', () => {
			const el = document.activeElement
			if(!(el instanceof CodeAreaElement)) return
			if(el) el.#os = el.#textarea.selectionStart, el.#oe = el.#textarea.selectionEnd
		}), ['value', 'disabled'])
		#basePattern = []
		#lineStyle = ''; #lineStyle2 = null
		#firstLine = 1
		get firstLine(){ return this.#firstLine }
		set firstLine(a){
			this.#firstLine = Math.floor(+a || 0)
			this.#el.style.counterReset = 'l '+(this.#firstLine-1)
		}
		get visibleLineCount(){ return this.#el.childNodes.length*.5 }
		get defaultLineStyle(){ return this.#lineStyle2 }
		set defaultLineStyle(cl){
			const old = this.#lineStyle
			this.#lineStyle = cl = (this.#lineStyle2 = typeof cl == 'symbol' ? cl : null) ? cl.description : ''
			if(cl == old) return
			const ch = this.#el.childNodes
			for(let i = ch.length-2; i >= 0; i-=2){
				const c = ch.item(i).classList
				old ? cl ? c.replace(old, cl) : c.remove(old) : cl && c.add(cl)
			}
		}
		setLineStyle(line, style = null, message = null){
			style = typeof style == 'symbol' ? style.description : this.#lineStyle
			const el = this.#el.childNodes.item(Math.floor(line - this.#firstLine)*2)
			if(el){
				el.className = style, typeof message == 'string' ? el.dataset.message = message : delete el.dataset.message
				return true
			}
			return false
		}
		resetAllLineStyles(){
			const ch = this.#el.childNodes
			for(let i = ch.length-2; i >= 0; i-=2){
				const el = ch.item(i)
				el.className = this.#lineStyle, typeof message == 'string' ? el.dataset.message = message : delete el.dataset.message
			}
		}
		getLineStyle(line = 0){
			const cl = this.#el.childNodes.item(Math.floor(line - this.#firstLine)*2)?.classList
			if(!cl || !cl.length) return null
			return Symbol.for(cl.item(0))
		}
		getLineMessage(line = 1){
			const el = this.#el.childNodes.item(Math.floor(line - this.#firstLine)*2)
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
		submitChangeEvent = () => {
			if(!this.#codeScheduled)
				this.#codeScheduled = requestAnimationFrame(() => {
				this.#codeScheduled = 0
				this.onchange?.call(this, this.#textarea.value)
			})
		}
		cancelChangeEvent(){
			if(this.#codeScheduled >= 0){
				cancelAnimationFrame(this.#codeScheduled)
				this.#codeScheduled = 0
			}
		}
		onchange = null
		get disabled(){ return this.#textarea.disabled }
		set disabled(a){ this.#textarea.disabled = a }
		get value(){ return this.#textarea.value }
		set value(a){
			this.#textarea.value = a
			this.rehighlight()
			this.submitChangeEvent()
		}
		get selectionStart(){ return this.#textarea.selectionStart }
		get selectionEnd(){ return this.#textarea.selectionEnd }
		set selectionStart(a){ this.#os = this.#textarea.selectionStart = a }
		set selectionEnd(a){ this.#oe = this.#textarea.selectionEnd = a }
		get selectionAnchor(){ return this.#textarea.selectionDirection=='backward' ? this.selectionEnd : this.#textarea.selectionStart }
		get selectionFocus(){ return this.#textarea.selectionDirection=='backward' ? this.selectionStart : this.#textarea.selectionEnd }
		set selectionAnchor(v){
			const a = this.#textarea
			const bw = a.selectionDirection=='backward', tip = bw ? this.selectionStart : a.selectionEnd
			if(v > tip) a.selectionEnd = v, bw || (a.selectionDirection = 'backward', a.selectionStart = tip)
			else a.selectionStart = v, bw && (a.selectionDirection = 'forward', a.selectionEnd = tip)
		}
		set selectionFocus(v){
			const a = this.#textarea
			const bw = a.selectionDirection=='backward', anc = bw ? this.selectionEnd : a.selectionStart
			if(v > anc) a.selectionEnd = v, bw && (a.selectionDirection = 'forward', a.selectionStart = anc)
			else a.selectionStart = v, bw || (a.selectionDirection = 'backward', a.selectionEnd = anc)
		}
		#redraw(i,oe,ne){
			const v = this.#textarea.value
			let e = 0, j = 1, k = 1, l = 0
			const ch = this.#el.childNodes, count = ch.length-1
			let el = ch.item(1), ch2
			let state = null, sl = 0, sz = null, stack = null
			// Allows one token of lookahead leniency for regexes
			if(count<0){
				const el2 = el = document.createElement('div')
				el2.setAttribute('inert', '')
				const lab = document.createElement('label')
				if(this.#lineStyle) lab.classList.add(this.#lineStyle)
				el2.append('')
				el2.stack = [this.#basePattern]
				stack = [this.#basePattern]
				i = el2.l = 0
				ch2 = el2.childNodes
				this.#el.append(lab, el2)
			}else for(;j<=count;j+=2){
				el = ch.item(j); let l1 = el.l+(j==count)
				if((e += l1) < i) continue
				e -= l1
				ch2 = el.childNodes; let len = ch2.length-1
				if(len && e + ch2.item(1).l > i && j>1) do{
					// prev token will be on prev line!
					l1 = (el = ch.item(j -= 2)).l, e -= l1, ch2 = el.childNodes, len = ch2.length-1
				}while(len < 1 && j>1)
				stack = el.stack.slice()
				let otok = ch2.item(1), oe = e, l2 = 0, k2 = 1; k = 1
				if(len) for(;;){
					const tok = ch2.item(k2), l = tok.l
					if(k2 == len || (e + l) > i) break
					if(l){while(oe < e){
						oe += otok.l
						if(otok.f){
							let t = otok.textContent
							if(k2 == len){
								let j2 = j, ch3
								do ch3 = ch.item(j2+=2).childNodes, t += '\n', t += ch3.item(0).textContent
								while(ch3.length <= 1)
							}
							const st = stack[stack.length-1]
							otok.f(stack, t)
							if(!stack.length) stack.push(st)
						}
						otok = otok.nextSibling
						k++
					}; e += l2 = l}
					k2++
				}
				i = e - l2
				break
			}
			state = stack[stack.length-1]
			sl = state.length-1, sz = state.length&1 ? state[sl] : null
			l = Math.min(this.#ol-oe, v.length-ne)
			e = l+i; l = this.#ol-e; e = (this.#ol = v.length)-e
			let tok = ch2.item(k)
			const stack2 = stack.slice()
			const addToken = (t, style) => {
				let f = null
				if(typeof style == 'function'){
					style = (f = style)(stack, t)
					if(!stack.length) stack.push(state)
					if(state != (state = stack[stack.length-1]))
						sl = state.length-1, sz = state.length&1 ? state[sl] : null
				}
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
					let el2, lab
					if(excess.length){
						({0: lab, 1: el2} = excess.splice(0, 2))
						el2.firstChild.replaceWith(n)
						el2.stack = stack.slice()
					}else{
						el2 = document.createElement('div')
						el2.setAttribute('inert', '')
						lab = document.createElement('label')
						if(this.#lineStyle) lab.classList.add(this.#lineStyle)
						el2.append(n)
						let l1 = 0
						this.#el.insertBefore(el2, el.nextSibling)
						this.#el.insertBefore(lab, el2)
						while(ch2.length > k){ const n = ch2.item(k); el2.append(n); l1 += n.l; el.l -= n.l }
						el2.stack = stack.slice(); el2.l = l1
					}
					ch2 = (el = el2).childNodes; j+=2
					tok = ch2.item(k = 1)
				}
			}
			const excess = []
			const remTokens = () => { while(l > 0){
				let x = null
				if(tok) el.l -= tok.l
				else if(excess.length){
					x = excess[excess.length-1]
					tok = x.childNodes.item(1)
					if(!tok) break
					x.l -= tok.l
				}else break
				l -= tok.l; tok.remove()
				let t = tok.textContent, f = tok.f
				if(x ? x.childNodes.length == 1 : k == ch2.length){
					let el2, j2 = j+excess.length
					while(el2 = ch.item(j2+2)){
						excess.push(ch.item(j2+1), el2); j2 += 2
						if(f) t += '\n', t += el2.childNodes.item(0).textContent
						if(el2.childNodes.length > 1) break
					}
					tok = undefined
				}else tok = x ? undefined : ch2.item(k)
				if(f) f(stack2, t)
			} }
			remTokens()
			l -= e; let inv = 0
			t: while(i < v.length){
				for(let q = 0; q < sl; q+=2){
					const r = state[q]; let len = 0
					if(typeof r == 'string'){
						if(!r.includes(v[i])) continue
						for(;;) if(!r.includes(v[i+ ++len])) break
						l += len
						remTokens()
					}else if(r instanceof RegExp){
						r.lastIndex = i
						if(!r.test(v)) continue
						len = r.lastIndex-i
						if(!len && !r.flags.includes('y')){ console.error("Regex %s doesn't have the y flag", r); continue }
						l += len
						remTokens()
					}
					if(inv) addToken(v.slice(i-inv, i), sz)
					addToken(v.slice(i, i += len), state[q+1])
					inv = 0
					if(l) continue t
					const sl = stack.length
					if(sl != stack2.length) continue t
					for(let i = sl-1; i >= 0; i--) if(stack[i] != stack2[i]) continue t
					break t
				}
				inv++; i++; l++
			}
			if(inv){
				l += inv
				remTokens()
				addToken(v.slice(i-inv), sz)
			}
			if(excess.length){
				const ch = excess[excess.length-1].childNodes
				for(const n of excess) n.remove()
				while(ch.length > 1){ const n = ch.item(1); el.insertBefore(ch.item(1), tok), el.l += n.l }
			}
			const w = Math.floor(Math.log10(Math.max(-this.#firstLine, ch.length*.5+this.#firstLine-1)))+1.5
			this.#el.style.setProperty('--g', this.#textarea.style.paddingLeft = `max(var(--min-gutter) * 1ch,${w}ch)`)
		}
		insert(t, s = this.#textarea.selectionStart, e = this.#textarea.selectionEnd, seek = undefined){
			this.#textarea.setRangeText(t, s, e, typeof seek == 'boolean' ? seek ? 'end' : 'start' : 'preserve')
			this.#redraw(s,e,s+t.length)
		}
		select(a, b = a){
			const m = Math.min(a,b)
			this.#textarea.setSelectionRange(this.#os = m,this.#oe = a+b-m,m==a?'forward':'backward')
		}
		static TAB_OVERRIDE = (s, e, v, c, ev) => {
			if(s === e) c.insert('\t', s, e, true)
			else c.insert(ev.shiftKey ? v.replace(/\n\t/g,'\n') : v.replace(/\n/g,'\n\t'))
		}
		keyOverrides = new Map().set('Tab', CodeAreaElement.TAB_OVERRIDE)
		constructor(){
			super()
			this.#sh.adoptedStyleSheets.push(sheet)
			this.#sh.appendChild(this.#el)
			this.#sh.append(this.#textarea)
			this.#textarea.spellcheck = false
			this.#textarea.onchange = this.submitChangeEvent
			this.#textarea.onkeydown = ev => {
				if(ev.keyCode === 13 && ev.shiftKey){ if(!this.#codeScheduled) this.submitChangeEvent(); return false }
				const s = this.#textarea.selectionStart, e = this.#textarea.selectionEnd, v = this.#textarea.value.slice(s, e)
				let k = ev.key
				if(k.length == 1) k = k.toUpperCase()
				const k0 = k
				if(ev.shiftKey&&k0!='Shift') k = 'Shift+'+k
				if(ev.altKey&&k0!='Alt') k = 'Alt+'+k
				if((ev.ctrlKey||ev.metaKey)&&k0!='Control'&&k0!='Meta') k = 'Ctrl+'+k
				const o = this.keyOverrides.get(k) ?? this.keyOverrides.get(k0)
				if(o) o(s, e, v, this, ev) || ev.preventDefault()
			}
			this.#textarea.oninput = ev => {
				const t = this.#textarea, e = t.selectionStart
				if(ev.inputType == 'insertCompositionText'){
					const d = ev.data, e2 = e-d.length
					if(t.value.slice(e2,e) == d && this.#os>e2) this.#os = e2
				}
				this.#redraw(Math.min(this.#os, this.#os = t.selectionStart), this.#oe, this.#oe = e)
				if(SAFARI) // force deterministic text wrapping, truly a safari moment of all time
					t.style.display = 'none', t.offsetWidth, t.style.display = ''
			}
			this.#el.onclick = ev => {
				const target = ev.composedPath()[0]
				if(!(target instanceof HTMLLabelElement)) return
				const ch = this.#el.childNodes, l = ch.length
				for(let i = 0; i < l; i++) if(ch.item(i*2) == target){
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
			this.#rhScheduled = requestAnimationFrame(() => {
				if(!this.#rhScheduled) return
				this.#rhScheduled = 0
				this.#redraw(0, this.#ol, this.#textarea.value.length)
			})
		}
	})}