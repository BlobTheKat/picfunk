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
function addFile(file){
	if(sourcesContainer.childElementCount > maxTextures) return
	if(!file.type.startsWith('image/')) return
	const n = texTemplate.cloneNode(true)
	const {0:a,1:b,2:c,3:d} = n.children
	a.src = URL.createObjectURL(file)
	let name = b.value = makeName(file.name)
	let t = null
	a.onload = () => {
		if(t) return
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
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a)
		gl.generateMipmap(gl.TEXTURE_2D)
		images.set(name, t)
		code()
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
			item.getAsString(s => /https?:\/\//.test(s) && fetch(s).then(a => a.blob()).then(addFile))
			continue
		} 
		const f = item.getAsFile()
		if(f) addFile(f)
	}
}

document.body.addEventListener('paste', e => addFromTransfer(e.clipboardData))

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

gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
const usedTextures = new Int32Array(maxTextures+31>>5)

// Simple (-1,-1,1,1) input-less shader
const vsh = gl.createShader(gl.VERTEX_SHADER)
const fsh = gl.createShader(gl.FRAGMENT_SHADER)
gl.shaderSource(vsh, `#version 300 es
precision mediump float;
out vec2 pos;
void main(){
	pos = vec2(float(gl_VertexID&1),float((gl_VertexID>>1)&1));
	gl_Position = vec4(pos*2.-1.,0.,1.);
}
`)
gl.compileShader(vsh)
const p = gl.createProgram()
gl.attachShader(p, vsh)
gl.attachShader(p, fsh)
let err = '', tLoc = null
let tOrigin = 0
let errors = []
function makeError(err,c){
	const p = c?c.previousElementSibling:highlighted.lastElementChild
	if(p && p.dataset.c){
		//p.dataset.c = Math.min(p.dataset.c - -1,9)
		//p.dataset.t += '\n'+err.trim()
		return
	}
	const n = document.createElement('err')
	n.dataset.c = '!'//1
	n.dataset.t = err.trim()
	highlighted.insertBefore(n, c)
	errors.push(n)
}
function code(){
	for(const e of errors) e.remove()
	cancelAnimationFrame(raf)
	errors.length = 0
	gl.shaderSource(fsh, `#version 300 es
#define getColor(a,b) (texture(a, b))
#define getPixel(a,b) (texelFetch(a, b, 0))
#define getSize(a) (textureSize(a,0))
#define tex sampler2D
#define coords (ivec2(gl_FragCoord.xy))
precision mediump float;
uniform float t;
uniform ivec2 size;
${images.size?'struct _TexturesType{sampler2D '+[...images.keys()]+';};uniform _TexturesType images;':''}
in vec2 pos;
out vec4 color;
const float PI=3.141592653589793, E=2.718281828459045;
#line 1
`+input.value)
	gl.compileShader(fsh)
	err = gl.getShaderInfoLog(fsh)
	if(err){
		const v = input.value.split('\n')
		const arr = []
		let c = 0, j = 0; for(const l of v) arr.push(c),c+=l.length+1
		c = 0; const ch = highlighted.children
		for(let e of err.split('\n')){
			if(e.startsWith('ERROR:')){
				e = e.slice(6)
				const w = e.indexOf(':'), i = e.indexOf(':', w+1)
				const idx = arr[e.slice(w+1, i)]; e = e.slice(i+1)
				let L = ch[j].textContent.length
				while(j<ch.length-1&&c+L<=idx) c+=L,L=ch[++j].textContent.length
				makeError(e, ch[j])
			}
		}
		if(errors.length)return
	}
	gl.linkProgram(p)
	gl.useProgram(p)
	err = gl.getProgramInfoLog(p)
	if(err){
		for(let e of err.split('\n')){
			if(e.startsWith('ERROR:')){
				e = e.slice(6)
				highlighted.makeError(e, highlighted.firstElementChild)
			}
		}
		if(errors.length)return
	}
	tLoc = gl.getUniformLocation(p, 't')
	tOrigin = performance.now()
	for(const {0:k,1:t} of images){
		const loc = gl.getUniformLocation(p, 'images.'+k)
		if(loc) gl.uniform1i(loc, t.id)
	}
	draw()
}
let panelH = 0
const {0:maxW,1:maxH} = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
function setsize(w, h){
	w = Math.min(maxW, w); h = Math.min(maxH, h)
	gl.canvas.width = w
	gl.canvas.height = h
	iW.value = w; iH.value = h
	gl.viewport(0, 0, w, h)
	panelH = Math.round(Math.min(h/w*(document.body.offsetWidth-176), document.body.offsetHeight/2-8))
	document.body.style.setProperty('--h', panelH+'px')
	draw()
}
const q = gl.createQuery()
const {TIME_ELAPSED_EXT=0} = gl.getExtension('EXT_disjoint_timer_query_webgl2')??0
const mspf = $('#mspf')
let mspfAvg = 0
function drawTime(dt){
	if(dt > 184400) return
	mspfAvg += (dt-mspfAvg)/30
	mspf.textContent = 'draw: '+mspfAvg.toFixed(2)+'ms'
}
let c = null
let raf = -1
let overdraw = 0
function draw(_time){
	if(errors.length) return
	gl.uniform2i(gl.getUniformLocation(p, 'size'), gl.canvas.width, gl.canvas.height)
	if(tLoc){
		raf = requestAnimationFrame(draw)
		gl.uniform1f(tLoc, (performance.now()-tOrigin)/1000)
		if(typeof _time === 'number' && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
			drawTime(gl.getQueryParameter(q, gl.QUERY_RESULT)/1000000)
	}
	if(TIME_ELAPSED_EXT) gl.beginQuery(TIME_ELAPSED_EXT, q)
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4+(overdraw<<1))
	if(TIME_ELAPSED_EXT) gl.endQuery(TIME_ELAPSED_EXT)
	if(!tLoc){
		if(!c) c=document.createElement('canvas').getContext('2d'),c.canvas.width=c.canvas.height=1
		c.drawImage(gl.canvas, 0, 0)
		setTimeout(() => {
			if(gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
				drawTime(gl.getQueryParameter(q, gl.QUERY_RESULT)/1000000)
		})
	}
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

void main(){
	// Try editing this
	color = getPixel(images.creo, coords);
	// Replace *= with = to see the original gradient
	color *= vec4(pos.x, pos.x*pos.y*1.5, pos.y, 1);
	// Try uploading an image and using getColor(images.<<your_image>>, pos); after the *=
\t
	// Uncomment this line for fun
	//color += vec4(0.8) * pow(mod(-t,0.667),2.0);
}`
const tokens = Object.entries({
	comment: /\/\/.*|\/\*([^*]|\*[^\/])*(\*\/|$)/y,
	macro: /(^|\n)#[^\n]+/y,
	int: /(\d+|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)[iu]?(?![\.\w])/yi,
	float: /(\d+\.\d*|\.\d+)(e\d+)?f?/yi,
	types: /([ui]?vec[234]|mat[234](x[234])?|float|u?int|tex|void)(?!\w)/y,
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

const iW = $('#w'), iH = $('#h')
iW.oninput = iH.oninput = function(){
	this.style.maxWidth = 0
	this.style.maxWidth = this.scrollWidth+'px'
}
iW.onchange = () => setsize(iW.value, gl.canvas.height)
iH.onchange = () => setsize(gl.canvas.width, iH.value)
iW.value = iH.value = 200
iW.oninput(); iH.oninput()

$('#fs').onclick = () => gl.canvas.requestFullscreen()

fetch('./creo.webp').then(a=>a.blob()).then(a => {a.name='creo';addFile(a)})

function download(){
	draw()
	gl.canvas.toBlob(a => {
		const l = document.createElement('a')
		l.download = 'picfunk-output'
		l.href = URL.createObjectURL(a)
		l.click()
		URL.revokeObjectURL(l.href)
	}, 'image/png')
}
$('#download').onclick = download
$('#copy').onclick = () => {
	draw()
	gl.canvas.toBlob(a => {
		navigator.clipboard.write([new ClipboardItem({'image/png': a})])
	}, 'image/png')
}

onkeydown = e => {
	if(e.keyCode===83&&e.metaKey) e.preventDefault(),download()
}
{
	const v = `#version 300 es
precision mediump float;

#define tex sampler2D
const float PI = 3.141592653589793;
const float E = 2.718281828459045;

// Get color at a position between (0,0) and (1,1) (corresponding to bottom-left and top-right of the texture). Linear interpolation applies
vec4 getColor(tex img, vec2 pos); // -> texture(...)
// Get the pixel at an ivec2 coordinate of the image between (0,0) and (img_width, img_height). No sampling / interpolation is done
vec4 getPixel(tex img, ivec2 coord) // -> texelFetch(..., 0)
// Get the size of a texture
vec2 getSize(tex img) // -> textureSize(...,0)

// Time elapsed in seconds
uniform float t;
// Output size
uniform ivec2 size;
// Struct of all images (address using images.<img_name>)
uniform struct images;
// Integer coordinates of the current pixel between (0,0) and (output_width, output_height)
in ivec2 coords;
// Current coordinates between (0,0) and (1,1)
in vec2 pos;
// Color to draw at current coordinates
out vec4 color;`; let inv = 0, i = 0
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

$('#editor').scrollTo(0, 1e10)