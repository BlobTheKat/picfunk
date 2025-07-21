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

function clearFiles(refresh){
	for(const t of images.values()){
		t.n.remove()
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.bindTexture(gl.TEXTURE_2D, null)
		gl.deleteTexture(t)
	}
	images.clear()
	uploadBtn.hidden = false
	if(refresh) code()
}

function addFile(file, nm = file.name, opts = 0){
	if(sourcesContainer.childElementCount > maxTextures) return toast('Maximum number of textures reached ('+maxTextures+')', '#ff0')
	if(file.name && !file.type.startsWith('image/')) return toast("Not an image: " + extOf(file), '#f00')
	const n = texTemplate.cloneNode(true)
	const {0:a,1:b,2:c,3:d,4:e,5:f,6:g} = n.children
	a.src = URL.createObjectURL(file)
	let name = b.value = makeName(nm)
	let t = null
	a.onerror = () => toast("Parsing image failed", '#f00')
	a.onload = () => {
		if(!(opts&256)) toast((file.name || '(From URL)') + ': ' + fmtSize(file.size))
		d.textContent = a.naturalWidth+'x'+a.naturalHeight
		if(!images.size) setsize(a.naturalWidth, a.naturalHeight)
		d.onclick = () => setsize(a.naturalWidth, a.naturalHeight)
		t = gl.createTexture()
		let i = 0; while(usedTextures[i]==-1) i++
		const j = 31-Math.clz32(~usedTextures[i]&usedTextures[i]+1)
		t.id = i<<5|j; t.opts = opts; t.blob = file; t.n = n
		usedTextures[i] |= 1<<j
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.bindTexture(gl.TEXTURE_2D, t)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opts&1 ? gl.NEAREST : gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts&4 ? gl.CLAMP_TO_EDGE : opts&2 ? gl.MIRRORED_REPEAT : gl.REPEAT)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opts&16 ? gl.CLAMP_TO_EDGE : opts&8 ? gl.MIRRORED_REPEAT : gl.REPEAT)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
		if(maxAniso)
			gl.texParameteri(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a)
		gl.generateMipmap(gl.TEXTURE_2D)
		images.set(name, t)
		sourcesContainer.insertBefore(n, uploadBtn)
		code()
	}
	e.onclick = () => {
		const repeat = e.classList.replace('repeat', 'repeat-mirror') ? 1 : e.classList.toggle('repeat-mirror') ? (e.classList.replace('repeat-mirror', 'repeat'), 0) : 2
		t.opts = t.opts&~6|repeat<<1
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat == 2 ? gl.CLAMP_TO_EDGE : repeat ? gl.MIRRORED_REPEAT : gl.REPEAT)
		if(!tLoc) draw()
	}
	f.onclick = () => {
		const repeat = f.classList.replace('repeat', 'repeat-mirror') ? 1 : f.classList.toggle('repeat-mirror') ? (f.classList.replace('repeat-mirror', 'repeat'), 0) : 2
		t.opts = t.opts&~24|repeat<<3
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat == 2 ? gl.CLAMP_TO_EDGE : repeat ? gl.MIRRORED_REPEAT : gl.REPEAT)
		if(!tLoc) draw()
	}
	g.onclick = () => {
		const linear = g.classList.toggle('linear')
		t.opts = t.opts&~1|!linear
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST)
		if(!tLoc) draw()
	}
	b.onchange = () => {
		images.delete(name)
		name = b.value = makeName(b.value)
		images.set(name, t)
		code()
	}
	c.onclick = () => {
		n.remove()
		images.delete(name)
		if(images.size == maxTextures-1) uploadBtn.hidden = false
		gl.activeTexture(gl.TEXTURE0+t.id)
		gl.bindTexture(gl.TEXTURE_2D, null)
		gl.deleteTexture(t)
		code()
	}
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

const uploadBtn = $('#upload'), uploadInput = document.createElement('input')
uploadInput.type = 'file'
uploadBtn.onclick = () => uploadInput.click()
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

const annotations = {
	error: CodeAreaStyle('background-color: #f008; color: white; backdrop-filter:blur(5px);--hover-padding:0.25lh'),
	warn: CodeAreaStyle('background-color: #f908; color: white; backdrop-filter:blur(5px);--hover-padding:0.25lh'),
	info: CodeAreaStyle('background-color: #8888; color: white; backdrop-filter:blur(5px);--hover-padding:0.25lh')
}

function code(){
	raf > 0 ? cancelAnimationFrame(raf) : raf < 0 && clearTimeout(raf)
	code0.resetAllLineStyles()
	const a = performance.now()
	gl.shaderSource(fsh, `#version 300 es
precision highp float;
uniform float t, tMax;
uniform ivec2 isize;
uniform vec2 size;
${images.size?'struct GL_TexturesType{sampler2D '+[...images.keys()]+';};uniform GL_TexturesType images;':''}
in vec2 GL_uv;
out vec4 GL_col;
const float PI=3.141592653589793,E=2.718281828459045,SQRT2=1.4142135623730951;
vec4 GL_main(vec2);
void main(){GL_col=GL_main(GL_uv);}
#define main GL_main
#line 1
`+code0.value)
	gl.compileShader(fsh)
	err = gl.getShaderInfoLog(fsh)
	if(err){
		if(code0.visibleLineCount > 50) toast('Shader compilation failed in '+(performance.now()-a).toFixed(2)+'ms', '#f00')
		for(let e of err.split('\n')){
			const i0 = e.indexOf(':'), i1 = e.indexOf(':', i0+1), i2 = e.indexOf(':', i1+1)
			const type = e.slice(0, i0), line = Math.max(1, +e.slice(i1+1, i2))
			let t = code0.getLineStyle(line) || annotations.info
			if(type == 'ERROR') t = annotations.error
			else if(type == 'WARNING') t != annotations.error && (t = annotations.warn)
			else if(type == 'NOTE' || type == 'INFO') t = annotations.info
			const l = code0.getLineMessage(line)
			code0.setLineStyle(line, t, l ? l+'\n'+e.slice(i2+1) : e.slice(i2+1))
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
		if(code0.visibleLineCount > 50) toast('Shader compilation failed in '+(performance.now()-a).toFixed(2)+'ms', '#f00')
		for(let e of err.split('\n')){
			let t = code0.getLineStyle(1) || annotations.info
			if(e.startsWith('ERROR:')) e = e.slice(6), t = annotations.error
			else if(e.startsWith('WARNING:')) e = e.slice(8), t != annotations.error && (t = annotations.warn)
			else if(e.startsWith('NOTE:') || e.startsWith('INFO:')) e = e.slice(5), t = annotations.info
			const l = code0.getLineMessage(1)
			code0.setLineStyle(1, t, l ? l+'\n'+e : e)
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
	panelH = Math.round(Math.max(100, Math.min(h/w*(document.body.offsetWidth-176), document.body.offsetHeight/2-8)))
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
	mspf.textContent = mspfAvg.toFixed(2).slice(mspfAvg<=.995)+'ms'
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

const code0 = $('#code'), code1 = $('#code1')
code0.oncompile = code
code0.basePattern = code1.basePattern = def
code0.value = `// Scroll up for docs

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
code1.value = `#version 300 es
precision highp float;

const float PI = 3.141592653589793;
const float E = 2.718281828459045;
const float SQRT2 = 1.4142135623730951;

// Output size
uniform vec2 size;
uniform ivec2 isize;
// Struct of all images
//   e.g texture(images.background, uv)
//   e.g texelFetch(images.atlas1, coords>>1, 1)
uniform struct images;
// Time variable for animations
uniform float t, tMax;

void main(){ gl_FragColor = main(gl_FragCoord.xy / vec2(size)); }`
requestAnimationFrame(() => requestAnimationFrame(() => $('#editor').scrollTo(0, 1e9)))

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
	gifDitherSel.style.display = gifRepeatSel.parentElement.style.display =
		expFormat == 'GIF' ? 'flex' : 'none'
	oldToast && oldToast.remove()
	oldToast = toast('Export format: '+expFormat, '#f08')
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

function saveBlob(a, name = 'picfunk-output'){
	const l = document.createElement('a')
	l.download = name
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

const chover = $('#canvashover')

gl.canvas.onmousemove = e => {
	const rw = gl.canvas.offsetWidth, rh = gl.canvas.offsetHeight
	const w = gl.canvas.width, h = gl.canvas.height
	const ra = rw*h-w*rh
	let x = e.layerX, y = rh-e.layerY
	if(ra > 0) x -= ra/h*.5
	else y -= (rh-h/w*rw)*.5
	const scale = Math.max(w/rw,h/rh)
	x *= scale; y *= scale
	if(Math.min(x,y, w-x, h-y) < 0){
		chover.style.display = 'none'
		return
	}
	chover.style.display = ''
	chover.textContent = `vec2(${(x/w).toFixed(3)},${(y/h).toFixed(3)})\nivec2(${Math.round(x)},${Math.round(y)})`
	const r = x < w*.5
	chover.style.right = r ? '0' : ''
	chover.style.textAlign = r ? 'right' : ''
	chover
}
gl.canvas.onmouseout = () => { chover.style.display = 'none' }

const uploadInput2 = document.createElement('input')
uploadInput2.type = 'file'
uploadInput2.accept = '.pf'

const enc = new TextEncoder(), dec = new TextDecoder(), rd = new FileReader()
const helper = new Uint8Array(8); helper[0] = 255
$('#load').onclick = () => uploadInput2.click()

function parsePfFileContents(buf, blob, off = 0){
	let i = 0
	clearFiles(false)
	while(true){
		let j = buf.indexOf(255, i)
		if(j < 0) return 'unterminated string'
		if(j == i){ i++; break }
		const type = dec.decode(buf.subarray(i, i = j)); i++
		j = buf.indexOf(255, i)
		if(j < 0) return 'unterminated string'
		const name = dec.decode(buf.subarray(i, i = j)); i++
		if(i + 7 >= buf.byteLength) return 'early truncation'
		const opts = buf[i++]
		const len = (buf[i++]<<16|buf[i++]<<8|buf[i++])*16777216|(buf[i++]<<16|buf[i++]<<8|buf[i++])
		const file = blob.slice(off, off += len, type)
		if(off > blob.size) return 'early truncation'
		addFile(file, name, opts|256)
	}
	const block = new DataView(buf.buffer, buf.byteOffset+i, 16); i += 16
	setsize(block.getUint16(0)+1, block.getUint16(2)+1)
	iT.value = (maxTime = block.getFloat32(4)) || ''
	iF.value = block.getFloat32(8) || ''; iF.onchange()
	iT.oninput(); iF.oninput()
	const fi = block.getUint8(12)
	expFormat = fi < formats.length ? formats[fi] : 'GIF'
	format.textContent = expFormat
	format.style.fontSize = expFormat.length > 3 ? '8px' : ''
	quality.style.display = expFormat == 'PNG' ? 'none' : ''
	gifDitherSel.style.display = gifRepeatSel.parentElement.style.display =
		expFormat == 'GIF' ? 'flex' : 'none'
	gifRepeat = block.getUint16(14)+1
	if(expFormat == 'GIF'){
		gifDither = dithers[fi>>1^127]
		gifDitherSel.textContent = 'Dither: ' + ditherTexts[fi>>1^127]
		if(fi&1) gifRepeat = 0
	}else gifRepeat = 0
	gifRepeatSel.value = gifRepeat
	expQuality = block.getUint8(13)/255
	quality.style.setProperty('--q', (expQuality*100).toFixed(2)+'%')
	quality.textContent = 'Quality: '+Math.round(expQuality*100)+'%'
	tOrigin = performance.now()
	while(i < buf.length){
		let j = buf.indexOf(255, i)
		if(j < 0) return 'unterminated string'
		const name = dec.decode(buf.subarray(i, i = j)); i++
		j = buf.indexOf(255, i)
		if(j < 0) return 'unterminated string'
		const payload = dec.decode(buf.subarray(i, i = j)); i++
		if(!name) code0.value = payload
	}
	code()
	return ''
}

uploadInput2.onchange = () => {
	const f = uploadInput2.files[0]
	uploadInput2.value = ''
	const err = v => { toast('Not a valid .pf file: '+v, '#f00') }
	if(f.size < 8) return err('too small for 8-byte header')
	rd.onload = () => {
		const header = new Uint8Array(rd.result)
		if(header[0] != 255 || header[1] != 80 || header[2] != 70) return err('Invalid magic header')
		const sz = (header[3]<<8|header[4])*16777216+(header[5]<<16|header[6]<<8|header[7])
		if(f.size < 8+sz) return err('header length field too large')
		rd.onload = () => {
			const e = parsePfFileContents(new Uint8Array(rd.result), f, rd.result.byteLength + 8)
			if(e) return err(e)
			toast('Imported '+fmtSize(f.size)+'!', '#f08')
		}
		rd.readAsArrayBuffer(f.slice(8, 8+sz))
	}
	rd.onerror = () => { rd.onload = null; err('FileReader error') }
	rd.readAsArrayBuffer(f.slice(0, 8))
}
const formats = ['PNG', 'JPEG', 'WEBP']
$('#save').onclick = () => {
	const res = [helper], res2 = [], ff = helper.subarray(0,1)
	let sz = 0
	for(const {0:name,1:img} of images){
		helper[1] = img.opts
		const sizel = img.blob.size|0, sizeh = Math.floor(img.blob.size/4294967296)
		helper[2] = sizeh>>8; helper[3] = sizeh; helper[4] = sizel>>24
		helper[5] = sizel>>16; helper[6] = sizel>>8; helper[7] = sizel
		const narr = enc.encode(name), narr2 = enc.encode(img.blob.type)
		sz += narr.length + narr2.length + 9
		res.push(narr2, ff, narr, helper.slice())
		res2.push(img.blob)
	}
	const block = new DataView(new ArrayBuffer(16))
	block.setUint16(0, gl.canvas.width-1)
	block.setUint16(2, gl.canvas.height-1)
	block.setFloat32(4, maxTime)
	block.setFloat32(8, +iF.value || 0)
	const fi = formats.indexOf(expFormat)
	block.setUint8(12, fi >= 0 ? fi : ~dithers.indexOf(gifDither)<<1|!gifRepeat)
	block.setUint8(13, Math.round(expQuality*255))
	block.setUint16(14, gifRepeat-1)
	const code = enc.encode(code0.value)
	res.push(ff, block.buffer, ff, code, ff); sz += code.length + 19
	for(const i of res2) res.push(i)
	// \xFFPF
	helper[1] = 80; helper[2] = 70; helper[3] = Math.floor(sz/4294967296)
	helper[4] = sz>>24; helper[5] = sz>>16; helper[6] = sz>>8; helper[7] = sz
	const b = new Blob(res, {type: '@file'}), d = new Date()
	const pstr = a => a.toString().padStart(2,'0')
	toast('Exported '+fmtSize(b.size)+'!', '#f08')
	saveBlob(b, `picfunk-${d.getFullYear()}-${pstr(d.getMonth())}-${pstr(d.getDate())}-at-${pstr(d.getHours())}-${pstr(d.getMinutes())}.pf`)
}

onkeydown = e => {
	if(e.keyCode == 83 && e.metaKey) e.preventDefault(), download()
}

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
