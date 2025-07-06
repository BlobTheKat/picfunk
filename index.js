const $ = document.querySelector.bind(document)
const texTemplate = $('.tex'), sourcesContainer = $('#sources')

const images = new Map()

const makeName = a => {
	let name = (a||'image').replace(/\..+$|\W/g,'')
	if(name[0]>='0'&&name[0]<='9')name='_'+name.slice(0, 11)
	else name = name.slice(0, 12)
	if(images.has(name)){
		let i = 0
		while(images.has(name+i)) i++
		name += i
	}
	return name
}

const extOf = file => {
	const i = file.name.lastIndexOf('.')
	if(i < 0) return '<unknown>'
	return file.name.slice(i).toLowerCase()
}
const fmtSize = size => {
	if(size < 768) return size + 'B'
	if(size < 786432) return (size/1024).toFixed(2) + 'KiB'
	if(size < 805306368) return (size/1048576).toFixed(2) + 'MiB'
	return (size/1073741824).toFixed(2) + 'GiB'
}

function addFile(file, nm = file.name){
	if(sourcesContainer.childElementCount > maxTextures) return
	if(!file.type.startsWith('image/')) return toast("Not an image: " + extOf(file), '#f00')
	const n = texTemplate.cloneNode(true)
	const {0:a,1:b,2:c,3:d,4:e,5:f,6:g} = n.children
	a.src = URL.createObjectURL(file)
	let name = b.value = makeName(nm)
	let t = null
	a.onerror = err => toast("Parsing image: " + err.message, '#f00')
	a.onload = () => {
		if(t) return
		toast((file.name || '(From URL)') + ': ' + fmtSize(file.size))
		d.textContent = a.naturalWidth+'x'+a.naturalHeight
		if(!images.size) setsize(a.naturalWidth, a.naturalHeight)
		d.onclick = () => setsize(a.naturalWidth, a.naturalHeight)
		t = gl.createTexture()
		let i = 0; while(usedTextures[i]==-1)i++
		const j = 31-Math.clz32(~usedTextures[i]&usedTextures[i]+1)
		t.id = i<<5|j
		usedTextures[i] |= 1<<j
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.bindTexture(gl.TEXTURE_2D, t)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
		if(maxAniso)
			gl.texParameteri(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a)
		gl.generateMipmap(gl.TEXTURE_2D)
		images.set(name, t)
		code()
	}
	e.onclick = () => {
		if(!t) return
		const id = e.dataset.c == 'R' ? 'M' : e.dataset.c == 'M' ? 'C' : 'R'
		e.dataset.c = e.textContent = id
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, id == 'R' ? gl.REPEAT : id == 'M' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE)
		if(!tLoc) draw()
	}
	f.onclick = () => {
		if(!t) return
		const id = f.dataset.c == 'R' ? 'M' : f.dataset.c == 'M' ? 'C' : 'R'
		f.dataset.c = f.textContent = id
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, id == 'R' ? gl.REPEAT : id == 'M' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE)
		if(!tLoc) draw()
	}
	g.onclick = () => {
		if(!t) return
		const id = g.dataset.c == 'L' ? 'N' : 'L'
		g.dataset.c = g.textContent = id
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, id == 'L' ? gl.LINEAR : gl.NEAREST)
		if(!tLoc) draw()
	}
	b.onchange = () => {
		if(!t) return void(b.value = name)
		images.delete(name)
		name = b.value = makeName(b.value)
		images.set(name, t)
		code()
	}
	c.onclick = () => {
		n.remove()
		images.delete(name)
		if(images.size == maxTextures-1) uploadBtn.hidden = false
		if(t){
			gl.activeTexture(gl.TEXTURE0+t.id)
			gl.bindTexture(gl.TEXTURE_2D, null)
			gl.deleteTexture(t)
		}else t=1
		code()
	}
	sourcesContainer.insertBefore(n, uploadBtn)
	if(sourcesContainer.childElementCount > maxTextures) uploadBtn.hidden = true
}
function addFromTransfer({items}){
	for(const item of items){
		if(item.type === 'text/plain'){
			item.getAsString(s => /https?:\/\//y.test(s) && fetch(s).then(a => a.blob()).then(addFile, err => toast("Pasted URL: " + err.message, '#f00')))
			continue
		} 
		const f = item.getAsFile()
		if(f) addFile(f)
	}
}

document.body.addEventListener('paste', e => document.activeElement == document.body && addFromTransfer(e.clipboardData))

document.body.ondragover = e => e.preventDefault()
document.body.ondrop = e => (e.preventDefault(),addFromTransfer(e.dataTransfer))

document.currentScript.remove()

const uploadBtn = $('#upload'), uploadInput = $('#uploadinput')
uploadBtn.onclick = () => {
	uploadInput.click()
}
uploadInput.onchange = () => {
	for(const f of uploadInput.files) addFile(f)
	uploadInput.value = ''
}
/**
 * @type WebGLRenderingContext
 */
const gl = $('#canvas').getContext('webgl2', {depth: false, stencil: false, desynchronized: true, antialias: false})
// Trust me, I know how to use opengl

const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
let maxAniso = aniso ? gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
const usedTextures = new Int32Array(maxTextures+31>>5)

// Simple (-1,-1,1,1) input-less shader
const vsh = gl.createShader(gl.VERTEX_SHADER)
const fsh = gl.createShader(gl.FRAGMENT_SHADER)
gl.shaderSource(vsh, `#version 300 es
precision mediump float;
out vec2 GL_uv;
void main(){
	GL_uv = vec2(float(gl_VertexID&1),float((gl_VertexID>>1)&1));
	gl_Position = vec4(GL_uv*2.-1.,0.,1.);
}
`)
gl.compileShader(vsh)
const p = gl.createProgram()
gl.attachShader(p, vsh)
gl.attachShader(p, fsh)
let err = '', tLoc = null, isizeLoc = null, sizeLoc = null, tMaxLoc = null
let tOrigin = -1, maxTime = 0, interval = 0
let errors = []
function makeError(err,c,t=''){
	const p = c?c.previousElementSibling:highlighted.lastElementChild
	if(p && p.dataset.c){
		p.dataset.c = Math.min((+p.dataset.c||1) + 1,9)
		p.dataset.t += '\n'+err.trim()
		return
	}
	const n = document.createElement('err')
	n.className = t
	n.dataset.c = '!'
	n.dataset.t = err.trim()
	highlighted.insertBefore(n, c)
	errors.push(n)
}
function code(){
	for(const e of errors) e.remove()
	raf > 0 ? cancelAnimationFrame(raf) : raf < 0 && clearTimeout(raf)
	errors.length = 0
	const a = performance.now()
	gl.shaderSource(fsh, `#version 300 es
precision mediump float;
uniform float t;
uniform ivec2 isize;
uniform vec2 size;
uniform float tMax;
${images.size?'struct GL_TexturesType{sampler2D '+[...images.keys()]+';};uniform GL_TexturesType images;':''}
in vec2 GL_uv;
out vec4 GL_col;
const float PI=3.141592653589793,E=2.718281828459045,SQRT2=1.4142135623730951;
vec4 GL_main(vec2);
void main(){GL_col=GL_main(GL_uv);}
#define main GL_main
#line 1
`+input.value)
	gl.compileShader(fsh)
	err = gl.getShaderInfoLog(fsh)
	if(err){
		//toast('Shader compilation failed in '+(performance.now()-a).toFixed(2)+'ms', '#f00')
		const v = input.value.split('\n')
		const arr = []
		let c = 0, j = 0; for(const l of v) arr.push(c),c+=l.length+1
		c = 0; const ch = highlighted.children
		for(let e of err.split('\n')){
			let t = ''
			if(e.startsWith('ERROR:')) e = e.slice(6)
			else if(e.startsWith('WARNING:')) e = e.slice(8), t = 'warn'
			else if(e.startsWith('NOTE:') || e.startsWith('INFO:')) e = e.slice(5), t = 'info'
			const w = e.indexOf(':'), i = e.indexOf(':', w+1)
			const idx = arr[e.slice(w+1, i)]; e = e.slice(i+1)
			let L = ch[j].textContent.length
			while(j<ch.length-1&&c+L<=idx) c+=L,L=ch[++j].textContent.length
			makeError(e, ch[j], t)
		}
	}
	if(!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)){
		if(!err) toast('Shader compilation failed (unknown error)')
		tOrigin = -1
		return
	}
	gl.linkProgram(p)
	gl.useProgram(p)
	err = gl.getProgramInfoLog(p)
	if(err){
		//toast('Shader compilation failed in '+(performance.now()-a).toFixed(2)+'ms', '#f00')
		for(let e of err.split('\n')){
			let t = ''
			if(e.startsWith('ERROR:')) e = e.slice(6)
			else if(e.startsWith('WARNING:')) e = e.slice(8), t = 'warn'
			else if(e.startsWith('NOTE:') || e.startsWith('INFO:')) e = e.slice(5), t = 'info'
			makeError(e, highlighted.firstElementChild)
		}
	}
	if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
		if(!err) toast('Program link failed (unknown error)')
		tOrigin = -1
		return
	}
	tLoc = gl.getUniformLocation(p, 't')
	isizeLoc = gl.getUniformLocation(p, 'isize')
	sizeLoc = gl.getUniformLocation(p, 'size')
	tMaxLoc = gl.getUniformLocation(p, 'tMax')
	tOrigin = performance.now()
	toast('Shader compiled in '+(tOrigin-a).toFixed(2)+'ms', '#0f0')
	for(const {0:k,1:t} of images){
		const loc = gl.getUniformLocation(p, 'images.'+k)
		if(loc) gl.uniform1i(loc, t.id)
	}
	draw()
}
let panelH = 0
const {0:maxW,1:maxH} = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
function setsize(w, h){
	w = Math.min(maxW, (w|0)||1); h = Math.min(maxH, (h|0)||1)
	gl.canvas.width = w
	gl.canvas.height = h
	iW.value = w; iH.value = h
	iW.oninput(); iH.oninput()
	gl.viewport(0, 0, w, h)
	panelH = Math.round(Math.min(h/w*(document.body.offsetWidth-176), document.body.offsetHeight/2-8))
	document.body.style.setProperty('--h', panelH+'px')
	if(!tLoc) draw()
}
const q = gl.createQuery()
const {TIME_ELAPSED_EXT=0} = gl.getExtension('EXT_disjoint_timer_query_webgl2')??0
const mspf = $('#mspf')
if(!TIME_ELAPSED_EXT) mspf.remove()
let mspfAvg = 0
function drawTime(dt){
	if(dt > 184400) return
	mspfAvg += (dt-mspfAvg)/30
	mspf.textContent = 'draw: '+mspfAvg.toFixed(2)+'ms'
}
let raf = 0
let overdraw = 0
function draw(_time){
	if(tOrigin < 0) return
	gl.uniform2i(isizeLoc, gl.canvas.width, gl.canvas.height)
	gl.uniform2f(sizeLoc, gl.canvas.width, gl.canvas.height)
	gl.uniform1f(tMaxLoc, maxTime)
	if(tLoc){
		raf = interval ? -setTimeout(draw, interval) : requestAnimationFrame(draw)
		const t = (performance.now()-tOrigin)/1000
		gl.uniform1f(tLoc, maxTime ? t%maxTime : t)
		if(typeof _time === 'number' && TIME_ELAPSED_EXT && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
			drawTime(gl.getQueryParameter(q, gl.QUERY_RESULT)/1000000)
	}
	if(TIME_ELAPSED_EXT) gl.beginQuery(TIME_ELAPSED_EXT, q)
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4+(overdraw<<1))
	if(TIME_ELAPSED_EXT) gl.endQuery(TIME_ELAPSED_EXT)
	if(!tLoc){
		let tries = 5
		if(TIME_ELAPSED_EXT) requestAnimationFrame(function test(){
			if(gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
				drawTime(gl.getQueryParameter(q, gl.QUERY_RESULT)/1000000)
			else if(--tries) requestAnimationFrame(test)
		})
	}
}
function quickdraw1(){
	if(tOrigin < 0) return false
	gl.uniform2i(isizeLoc, gl.canvas.width, gl.canvas.height)
	gl.uniform2f(sizeLoc, gl.canvas.width, gl.canvas.height)
	gl.uniform1f(tMaxLoc, maxTime)
	return true
}
function quickdraw2(t){
	gl.uniform1f(tLoc, t)
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4+(overdraw<<1))
}
onbeforeunload = () => true
const input = $('#input'), highlighted = $('#txt')
input.onchange = code
input.onkeydown = ev => {
	if(ev.keyCode === 13 && ev.shiftKey) code()
	else if(ev.keyCode === 9){
		const s = input.selectionStart, e = input.selectionEnd, v = input.value
		if(s === e){
			input.value = v.slice(0, s)+'\t'+v.slice(s)
			input.selectionStart = input.selectionEnd = s+1
		}else{
			if(ev.shiftKey) input.value = v.slice(0, s)+v.slice(s,e).replace(/\n\t/g,'\n')+v.slice(e)
			else input.value = v.slice(0, s)+v.slice(s,e).replace(/\n/g,'\n\t')+v.slice(e)
			input.selectionStart = s; input.selectionEnd = e+input.value.length-v.length
		}
		input.oninput()
	}else return
	ev.preventDefault()
}
input.value = `// Scroll up for docs

vec4 main(vec2 uv){
	// Try editing this
	vec4 color = texture(images.creo, uv);
	// Replace *= with = to see the original gradient
	color *= vec4(uv.x, uv.x*uv.y*1.5, uv.y, 1);
\t
	// Uncomment this line for fun
	//color += vec4(0.8) * pow(mod(-t,0.667),2.0);
	return color;
}`
const tokens = Object.entries({
	comment: /\/\/.*|\/\*([^*]|\*[^\/])*(\*\/|$)/y,
	macro: /(^|\n)#[^\n]+/y,
	int: /(\d+|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)[iu]?(?![\.\w])/yi,
	float: /(\d+\.\d*|\.\d+)(e\d+)?f?/yi,
	types: /([ui]?vec[234]|mat[234](x[234])?|float|u?int|u?sampler[23]D|void)(?!\w)/y,
	keyword: /(if|else|while|for|discard|return|break|continue|do|while|switch|case|default)(?!\w)/y,
	storage: /(precision|lowp|mediump|highp|const|in|out|inout|uniform|struct)(?!\w)/y,
	symbols: /[()[\]!%^&*:<>,/?|~\-=+]+/y,
	symbols2: /[;.{}]/y,
	id: /\w+/y,
})
let os = 0, oe = 0
document.onselectionchange = () => {os = input.selectionStart; oe = input.selectionEnd}
input.oninput = () => {
	let i = Math.min(input.selectionStart, os), l = Math.max(input.selectionEnd, oe) - i
	let e = 0, j = 1, L = 0
	const ch = highlighted.children, count = ch.length
	for(;j<count;j++){
		const t = ch[j].textContent
		if((e += t.length) <= i){ L=t.length; continue }
		e = i-e+t.length+L
		i -= e; l += e
		if(j>1)j--
		break
	}
	if(j==count)i -= L, l += L,j>1&&j--
	e = 0
	const v = input.value; let inv = 0
	t: while(i+inv < v.length){
		for(const {0:k,1:r} of tokens){
			r.lastIndex = i+inv
			if(!r.test(v)) continue
			const len = r.lastIndex-i
			e += len; l -= len
			let c = ch[j]
			while(c && (c.textContent.length > e)){
				e -= c.textContent.length, c.remove()
				c = ch[j]
			}
			if(inv){
				const n = document.createElement('span')
				n.textContent = v.slice(i, i+inv)
				highlighted.insertBefore(n, c); j++
			}
			const n = document.createElement('span')
			n.classList.add(k)
			n.textContent = v.slice(i+inv, i += len)
			highlighted.insertBefore(n, c); j++
			inv = 0
			if(l<=0&&!e) return
			continue t
		}
		inv++
	}
	while(j<ch.length) ch[j].remove()
	if(i<v.length){
		const n = document.createElement('span')
		n.textContent = v.slice(i)
		highlighted.append(n)
	}
	os = input.selectionStart; oe = input.selectionEnd
}
input.oninput()

const resize = $('#resize')
resize.onpointerdown = e => resize.setPointerCapture(e.pointerId)
resize.onpointerup = e => resize.releasePointerCapture(e.pointerId)
resize.onpointermove = e => {
	if(!resize.hasPointerCapture(e.pointerId)) return
	panelH = Math.round(Math.max(50, Math.min(e.clientY-8, document.body.offsetHeight-106)))
	document.body.style.setProperty('--h', panelH+'px')
}
resize.ontouchstart = e => e.preventDefault()

const iW = $('#w'), iH = $('#h'), iT = $('#t'), iF = $('#f')
const customInput = (el, checker) => {
	let lastS = 0, lastE = 0, lastV = ''
	el.onselectionchange = () => {
		lastS = el.selectionStart; lastE = el.selectionEnd; lastV = el.value
	}
	el.oninput = () => {
		if(checker(el.value)){
			lastS = el.selectionStart; lastE = el.selectionEnd; lastV = el.value
		}else{
			el.value = lastV
			el.selectionStart = lastS; el.selectionEnd = lastE
			return
		}
		el.style.maxWidth = 0
		const v = !el.value
		if(v) el.value = el.placeholder
		el.style.maxWidth = el.scrollWidth+'px'
		if(v) el.value = ''
	}
}
const isNum = v => {
	let dots = 0
	for(let i=0;i<v.length;i++){
		if(v.charCodeAt(i) === 46){
			if(++dots > 1) return false
		}
		else if(v.charCodeAt(i) < 48 || v.charCodeAt(i) > 57) return false
	}
	return true
}
customInput(iW, isNum); customInput(iH, isNum)
customInput(iT, isNum); customInput(iF, isNum)
iW.onchange = () => (setsize(+iW.value, gl.canvas.height))
iH.onchange = () => (setsize(gl.canvas.width, +iH.value))
iT.onchange = () => {
	maxTime = Math.abs(+iT.value||0)
	if(tOrigin >= 0) tOrigin = performance.now()
}
iF.onchange = () => {
	interval = Math.max(0, Math.min(250, +iF.value||0))
	if(interval > 0) interval = 1000/interval
}
iT.parentElement.onclick = e => {e.target != iT && iT.focus()}
iF.parentElement.onclick = e => {e.target != iF && iF.focus()}
iT.oninput(); iF.oninput()

const format = $('#format'), quality = $('#quality'), gifDitherSel = $('#gifdither'), gifRepeatSel = $('#gifrepeat')
let oldToast = null
let expQuality = 1, expFormat = 'PNG', gifDither = false, gifRepeat = 0
format.onclick = () => {
	const t = format.textContent
	expFormat = t == 'PNG' ? 'JPEG' : t == 'JPEG' ? 'WEBP' : t == 'WEBP' ? 'GIF' : 'PNG'
	format.textContent = expFormat
	format.style.fontSize = expFormat.length > 3 ? '8px' : ''
	quality.style.display = expFormat == 'PNG' ? 'none' : ''
	oldToast && oldToast.remove()
	oldToast = toast('Export format: '+expFormat, '#f08')
	gifDitherSel.style.display = gifRepeatSel.parentElement.style.display =
		expFormat == 'GIF' ? 'block' : 'none'
}
quality.ontouchstart = e => e.preventDefault()
quality.onpointerdown = e => quality.setPointerCapture(e.pointerId)
quality.onpointerup = e => quality.releasePointerCapture(e.pointerId)
quality.onpointermove = e => {
	if(!quality.hasPointerCapture(e.pointerId)) return
	e.preventDefault()
	expQuality = Math.min(1, Math.max(0, e.layerX / quality.offsetWidth))
	quality.style.setProperty('--q', (expQuality*100).toFixed(2)+'%')
	quality.textContent = 'Quality: '+Math.round(expQuality*100)+'%'
}
const dithers = [false, 'Atkinson', 'Atkinson-serpentine', 'FalseFloydSteinberg', 'FalseFloydSteinberg-serpentine', 'FloydSteinberg', 'FloydSteinberg-serpentine', 'Stucki', 'Stucki-serpentine']
const ditherTexts = ['None', 'Atkinson', 'Atkinson-S', 'FalseFS', 'FalseFS-S', 'FS', 'FS-S', 'Stucki', 'Stucki-S']
gifDitherSel.onclick = () => {
	let i = dithers.indexOf(gifDither)
	if(++i == dithers.length) i = 0
	gifDither = dithers[i]
	gifDitherSel.textContent = 'Dither: ' + ditherTexts[i]
}
customInput(gifRepeatSel, s => !/\D/.test(s))
gifRepeatSel.onchange = () => { gifRepeat = +gifRepeatSel.value }
const fs = $('#fs')
if(!document.fullscreenEnabled) fs.remove()
fs.onclick = () => gl.canvas.requestFullscreen()
fs.oncontextmenu = e => (e.preventDefault(), gl.canvas.requestFullscreen().then(() => {
	setsize(gl.canvas.offsetWidth * devicePixelRatio, gl.canvas.offsetHeight * devicePixelRatio)
}))

fetch('./creo.webp').then(a=>a.blob()).then(a => addFile(a,'creo'))

const toBlobFormats = {
	__proto__: null,
	'PNG': 'image/png',
	'JPEG': 'image/jpeg',
	'WEBP': 'image/webp',
}
const GIF_MAGIC = .0471012869725
function download(method = saveBlob){
	draw()
	const f = toBlobFormats[format.textContent]
	if(!f){
		// GIF
		const g = new GIF({
			workers: navigator.hardwareConcurrency || 4,
			quality: Math.round(Math.log(GIF_MAGIC+expQuality*(1-GIF_MAGIC))*-9.491221581+1),
			repeat: gifRepeat && (gifRepeat-1-(gifRepeat == 1)),
			width: gl.canvas.width,
			height: gl.canvas.height,
			dither: gifDither,
			workerScript: './gif.worker.js'
		})
		g.on('progress', p => {
			progress.textContent = 'Exporting: ' + Math.round(p*100) + '%\nClick to cancel'
		})
		g.on('finished', method)
		const progress = toast('Exporting GIF...\nClick to cancel', '#f08', () => {
			g.abort()
			progress.textContent = 'Export cancelled'
			progress.onclick = null
		})
		const opts = {copy:true, delay: interval || 33.333}
		const step = interval ? interval*.001 : .033333
		quickdraw1()
		const end = tLoc ? maxTime || 1 : 1e-308
		for(let t = 0; t < end; t += step){
			quickdraw2(t)
			g.addFrame(gl.canvas, opts)
		}
		g.render()
		draw()
		return
	}
	gl.canvas.toBlob(method, f, expQuality)
}

function saveBlob(a){
	const l = document.createElement('a')
	l.download = 'picfunk-output'
	l.href = URL.createObjectURL(a)
	l.click()
	URL.revokeObjectURL(l.href)
}

$('#download').onclick = download.bind(null, saveBlob)
$('#copy').onclick = download.bind(null, a => {
	navigator.clipboard.write([new ClipboardItem({[a.type]: a})]).catch(e => {
		toast('Copy Image: ' + e.message, '#f00')
	})
})

onkeydown = e => {
	if(e.keyCode===83&&e.metaKey) e.preventDefault(),download()
}
{
	const v = `#version 300 es
precision mediump float;

const float PI = 3.141592653589793;
const float E = 2.718281828459045;
const float SQRT2 = 1.4142135623730951;

// Output size
uniform vec2 size;
uniform ivec2 isize;
// Struct of all images (address using images.<img_name>)
uniform struct images;
// Time variable for animations
uniform float t;

void main(){ gl_FragColor = main(gl_FragCoord.xy / vec2(size)); }`; let inv = 0, i = 0
	const highlighted1 = $('#txt1')
	t: while(i+inv < v.length){
		for(const {0:k,1:r} of tokens){
			r.lastIndex = i+inv
			if(!r.test(v)) continue
			const len = r.lastIndex-i
			if(inv){
				const n = document.createElement('span')
				n.textContent = v.slice(i, i+inv)
				highlighted1.append(n)
			}
			const n = document.createElement('span')
			n.classList.add(k)
			n.textContent = v.slice(i+inv, i += len)
			highlighted1.append(n)
			inv = 0
			continue t
		}
		inv++
	}
}

$('#editor').scrollTo(0, 1e9)

const toasts = $('#toasts')
const clr = toasts.firstElementChild
clr.onclick = () => {
	toasts.textContent = ''
}
clr.remove()
function toast(msg, color = '#0f0', click = null){
	const n = document.createElement('div')
	n.style.backgroundColor = color
	n.textContent = msg
	n.title = new Date().toLocaleString()
	if(click) n.onclick = click, n.style.cursor = 'pointer'
	if(!toasts.childElementCount) toasts.append(clr)
	toasts.append(n)
	if(toasts.childElementCount > 101) toasts.children[1].remove()
	toasts.scrollTo(0, 1e9)
	return n
}
