// prettier-ignore
const VERTCIES = [
    1, 1, 1, -1, -1, 1,
    -1, -1, 1, -1, -1, 1
];
const DIMENSION_COUNT = 2;
const MIN_ITER = 50;
const MAX_ITER = 1500;
const SCROLL_MULTIPLIER = 0.2;

const VERTEX_SHADER = `
attribute vec2 vertexPosition;

varying vec2 vPos;

void main() {
    gl_Position = vec4(vertexPosition, 0.0, 1.0);
    vPos = vertexPosition;
}
`;

const FRAGMENT_SHADER = `
precision highp float;
varying highp vec2 vPos;
uniform highp vec2 pos;
uniform highp float zoom;
uniform int iterLimit;
const int maxIter = ${MAX_ITER};

int mandelbrot() {
    highp float x0 = vPos.x * zoom + pos.x;
    highp float y0 = vPos.y * zoom + pos.y;
    highp float x = 0.0;
    highp float y = 0.0;
    highp float x2 = 0.0;
    highp float y2 = 0.0;

    for (int i = 0; i < maxIter; i++) {
        if (x * x + y * y > 4.0|| i >= iterLimit) return i;
        y = 2.0 * x * y + y0;
        x = x2 - y2 + x0;
        x2 = x * x;
        y2 = y * y;
    }

    return maxIter;
}

void main() {
    int iter = mandelbrot();
    highp float color = float(iter) / float(iterLimit);
    gl_FragColor = vec4(color, color, color, 1.0);
}
`;

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    if (!vertexShader) return null;
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!fragmentShader) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

function attachDragEventListeners(gl, canvas, zoom, pos) {
    let isDragging = false;
    let lastX;
    let lastY;

    canvas.addEventListener('mousedown', (event) => {
        isDragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (!isDragging) return;

        let [x, y] = pos.get();
        let [zoomValue] = zoom.get();

        let deltaX = event.clientX - lastX;
        let deltaY = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;

        pos.set(x - (deltaX / canvas.width) * zoomValue * 2, y + (deltaY / canvas.height) * zoomValue * 2);
        render(gl);
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function attachZoomEventListeners(gl, canvas, zoom, pos) {
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        let rect = event.target.getBoundingClientRect();
        let [x, y] = pos.get();
        let [zoomValue] = zoom.get();

        let [mouseX, mouseY] = [event.clientX - rect.left, event.clientY - rect.top];
        let [worldX, worldY] = [
            x + 2 * (mouseX / canvas.width - 0.5) * zoomValue,
            y + 2 * (0.5 - mouseY / canvas.height) * zoomValue,
        ];
        zoomValue *= 1 + Math.sign(event.deltaY) * SCROLL_MULTIPLIER;

        zoom.set(zoomValue);
        pos.set(
            worldX - 2 * (mouseX / canvas.width - 0.5) * zoomValue,
            worldY - 2 * (0.5 - mouseY / canvas.height) * zoomValue
        );
        render(gl);
    });
}

function attachCanvasEventListeners(gl, canvas, zoom, pos) {
    attachDragEventListeners(gl, canvas, zoom, pos);
    attachZoomEventListeners(gl, canvas, zoom, pos);
}

function render(gl) {
    gl.drawArrays(gl.TRIANGLES, 0, VERTCIES.length / DIMENSION_COUNT);
}

class UniformValue {
    constructor(gl, program, name, fn_set, ...values) {
        this.gl = gl;
        this.fn_set = fn_set;
        this.location = gl.getUniformLocation(program, name);

        if (this.location === null || gl.getError() !== gl.NO_ERROR) {
            throw new Error(`An error occurred getting the location of the uniform ${name}`);
        }

        this.set(...values);
    }

    set(...values) {
        this.values = values;
        this.fn_set.apply(this.gl, [this.location, ...values]);
    }

    get() {
        return this.values;
    }
}

function main() {
    const canvas = document.querySelector('#canvas');

    if (!canvas) {
        console.error('Unable to find the canvas element');
        return;
    }

    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) {
        return;
    }

    gl.useProgram(program);

    const vertexPosition = gl.getAttribLocation(program, 'vertexPosition');
    if (vertexPosition === -1) {
        console.error('An error occurred getting the vertexPosition attribute');
        return;
    }

    gl.enableVertexAttribArray(vertexPosition);
    if (gl.getError() !== gl.NO_ERROR) {
        console.error('An error occurred setting the vertexPosition attribute');
        return;
    }

    const pos = new UniformValue(gl, program, 'pos', gl.uniform2f, -0.5, 0);
    const zoom = new UniformValue(gl, program, 'zoom', gl.uniform1f, 2);
    const iterLimit = new UniformValue(gl, program, 'iterLimit', gl.uniform1i, 100);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(VERTCIES), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
    render(gl);

    attachCanvasEventListeners(gl, canvas, zoom, pos);
}

main();
