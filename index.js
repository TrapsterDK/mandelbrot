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

function createProgram(gl, vertexShader, fragmentShader) {
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

function createShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
        return null;
    }
    return createProgram(gl, vertexShader, fragmentShader);
}

function main() {
    const canvas = document.querySelector('#canvas');

    if (!canvas) {
        console.error('Unable to find the canvas element');
        return;
    }

    //const context = canvas.getContext('webgpu');

    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vertexShaderSource = `
        attribute vec2 aVertexPosition;
        varying vec2 vPos;

        void main() {
            gl_Position = vec4(aVertexPosition, 0.0, 1.0);
            vPos = aVertexPosition;
        }
    `;

    const fragmentShaderSource = `
        varying highp vec2 vPos;
        const int maxIter = 50;

        int mandelbrot() {
            highp float x = 0.0;
            highp float y = 0.0;
            highp float x2 = 0.0;
            highp float y2 = 0.0;

            for (int i = 0; i < maxIter; i++) {
                if (x * x + y * y > 4.0) return i;
                y = 2.0 * x * y + vPos.y;
                x = x2 - y2 + vPos.x;
                x2 = x * x;
                y2 = y * y;
            }
            return maxIter;
        }

        void main() {
            int iter = mandelbrot();
            highp float color = float(iter) / float(maxIter);
            gl_FragColor = vec4(color, color, color, 1.0);
        }
    `;

    const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!shaderProgram) {
        return;
    }

    gl.useProgram(shaderProgram);

    const vertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    if (vertexPosition === -1) {
        console.error('An error occurred getting the vertexPosition attribute');
        return;
    }

    gl.enableVertexAttribArray(vertexPosition);
    if (gl.getError() !== gl.NO_ERROR) {
        console.error('An error occurred setting the vertexPosition attribute');
        return;
    }

    var dim = 2;
    // prettier-ignore
    const vertices = [
        1, 1, 1, -1, -1, 1,
        -1, -1, 1, -1, -1, 1
    ];

    // draw rectangle
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / dim);
}

main();
