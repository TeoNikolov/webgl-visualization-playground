// user parameters
var gridX = 32; // number of grid columns
var gridY = 18; // number of grid rows

// linearly interpolate between the four corners and compute height
var uniformCellHeight = true;
var cellZHeightUniform = 0.0020; // the Z-axis height of the midpoint of the cell
var cellZHeightTL = 0.0;
var cellZHeightTR = 0.05;
var cellZHeightBR = 0.05;
var cellZHeightBL = 0.0;

var isLightDirectional = false;

// init parameters
var canvas,
	gl;
var vertShaderNames = ["default"]; // the total count of shader programs
var fragShaderNames = ["default"];

var shaderSources = [];
var shadersInitialized = false;
var shaders = null; // the actual shader programs
var programInfo = null; // information about the shader program such as attributes
var buffers = null;

// buffer data
var v_vertices = null;
var v_screenvertices = [-1.0, 1.0, 0.0,
						 -1.0, -1.0, 0.0,
						 1.0, 1.0, 0.0,
						 -1.0, -1.0, 0.0,
						 1.0, -1.0, 0.0,
						 1.0, 1.0, 0.0];
var f_normals = null; // 3 per face (flat shading)

// render and game variables
var mousePos = [0, 0];
var mousePosNDC = [-1, -1];
var aspectRatio = 1.0;
var animatedPosNDC = [-1, -1];
var lightHeight = 0.8;
var timestampOld = 0.0;
var timeColor = 0.0;
var rgbSpeeds = [8.0, 16.0, 4.0];

// shader params
var HUDBackgroundColor = [0.2, 0.2, 0.2];
var HUDTransparency = 0.2;
var transparentHUD = false;
var useMouseEnabled = false;
var mozaicEnabled = false;
var mozaicMinDotAngle = 0.9985;
var mozaicMinDotAngleControlMin = 0.95;
var mozaicMinDotAngleControlMax = 0.9999;
var mozaicTopLeftColor = [1.0, 0, 0];
var mozaicTopRightColor = [0, 0, 1.0];
var mozaicBottomLeftColor = [0, 1.0, 0];
var mozaicBottomRightColor = [0, 1.0, 1.0];

init();

function init() {
	document.onmousemove = (function() {
		var e = window.event;
		mousePos = [e.clientX, e.clientY];
		updateMousePosNDC();
	})
	canvas = document.getElementById("c");
	// update aspect ratio whenever the viewport is resized
	window.onresize = (function() {
		aspectRatio = canvas.clientWidth / canvas.clientHeight;
	})

	mousePos = [canvas.width / 2, canvas.height / 2];
	updateMousePosNDC();
	
	gl = canvas.getContext("webgl");
	gl.viewport(0.0, 0.0, canvas.width, canvas.height);
	aspectRatio = canvas.clientWidth / canvas.clientHeight;
	if (gl === null) {
		console.err("Could not load WebGL context - not supported by browser.");
		alert("Your browser does not support WebGL!");
		return;
	}
	
	initControls(); // set all HTML controls to reflect program parameters
	initInput(); // assign event listeners for user input (e.g key-presses)
	updateMozaicData();
	initShaders(); // load and compile shader data
	initBuffers(); // allocate new buffers and attach data pointers
	
	window.requestAnimationFrame(main);
}

function main(timestamp) {
	var deltaTime = timestamp - timestampOld;
	document.getElementById('fps-overlay').innerHTML = parseInt(1000 / deltaTime).toString();
	if (shadersInitialized) {
		gl.useProgram(programInfo[0].program);
		update(deltaTime);
		render(deltaTime);
	}
	timestampOld = timestamp;
	window.requestAnimationFrame(main);
}

function updateMousePosNDC() {
	var canvasBox = canvas.getBoundingClientRect();
	var mousePosNDCX = (mousePos[0] / canvasBox.width) * 2 - 1;
	var mousePosNDCY = 1 - (mousePos[1] / canvasBox.height) * 2; // Y inverted
	mousePosNDC = [mousePosNDCX, mousePosNDCY];
}

function update(deltaTime) {
	timeColor += deltaTime;
	if (timeColor >= 2000) {
		timeColor -= 2000;
	}
	animatePosition();
	updateUniformShaderVariables();
}

function animatePosition() {
	animatedPosNDC[0] += 0.01;
	animatedPosNDC[1] += 0.0065;
	
	if (animatedPosNDC[0] > 1.0) {
		animatedPosNDC[0] = -1.0;
	}

	if (animatedPosNDC[1] > 1.0) {
		animatedPosNDC[1] = -1.0;
	}
}

function updateUniformShaderVariables() {
	var objectPosition = useMouseEnabled ? mousePosNDC : animatedPosNDC;
	
	gl.uniform3fv(programInfo[0].uniformLocations.rgbSpeed, rgbSpeeds);
	gl.uniform1f(programInfo[0].uniformLocations.aspectRatio, aspectRatio);
	gl.uniform2fv(programInfo[0].uniformLocations.mousePosition, objectPosition);
	gl.uniform1f(programInfo[0].uniformLocations.time, timeColor * 0.001);
	gl.uniform3fv(programInfo[0].uniformLocations.lightPosition, [objectPosition[0], objectPosition[1], lightHeight]);
	gl.uniform1i(programInfo[0].uniformLocations.isLightDirectional, isLightDirectional);
	gl.uniform1i(programInfo[0].uniformLocations.mozaicEnabled, mozaicEnabled);
	gl.uniform1f(programInfo[0].uniformLocations.mozaicMinDotAngle, mozaicMinDotAngle);
	gl.uniform3fv(programInfo[0].uniformLocations.mozaicTopLeftColor, mozaicTopLeftColor);
	gl.uniform3fv(programInfo[0].uniformLocations.mozaicTopRightColor, mozaicTopRightColor);
	gl.uniform3fv(programInfo[0].uniformLocations.mozaicBottomLeftColor, mozaicBottomLeftColor);
	gl.uniform3fv(programInfo[0].uniformLocations.mozaicBottomRightColor, mozaicBottomRightColor);
}

function render(delta) {
	gl.clearColor(0.5, 0.5, 0.5, 1.0);  // Clear to black, fully opaque
	gl.clearDepth(1.0);                 // Clear everything
	gl.enable(gl.DEPTH_TEST);           // Enable depth testing
	gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);	
	
	// Tell WebGL how to pull out the colors from the color buffer
	// into the vertexColor attribute.
	{	
		// frag normals buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
		gl.enableVertexAttribArray(programInfo[0].attribLocations.fragNormals);
		gl.vertexAttribPointer(programInfo[0].attribLocations.fragNormals, 3, gl.FLOAT, false, 0, 0);

		// positions buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.enableVertexAttribArray(programInfo[0].attribLocations.vertexPosition);
		gl.vertexAttribPointer(programInfo[0].attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
	}

	// draw
	{
		// const vertexCount = gridX * gridY * 12;
		var vertexCount;
		if (mozaicEnabled) {
			vertexCount = v_vertices.length / 3;	
		} else {
			vertexCount = 6;
		}
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}
}

function initInput() {
	document.onkeydown = function(event) {
		var lightPositionMoveDelta = 0.05;
		switch (event.keyCode) {
			case 37: // left arrow
				lightPosition[0] -= lightPositionMoveDelta;
				break;
			case 38: // up arrow
				lightPosition[1] += lightPositionMoveDelta;
				break;
			case 39: // right arrow
				lightPosition[0] += lightPositionMoveDelta;
				break;
			case 40: // down arrow
				lightPosition[1] -= lightPositionMoveDelta;
				break;
		}
	}
}

// reads the source for all vertex and fragment shaders asynchronously
// returns an array of strings, formatted as [vertex_1, fragment_1, vertex_2, fragment_2, ...]
function initShaders() {
	var promises = [];
	for (i = 0; i < vertShaderNames.length; i++) {
		// vertex shader promise
		promises[i*2] = new Promise(function(resolve, reject) {
			var req = new XMLHttpRequest();
			var filename = "./shaders/" + vertShaderNames[i] + ".vert";
			req.open("GET", filename, true);
			req.responseType = "text";
			req.onreadystatechange = function () {
				if(req.readyState === 4) {
					if (req.status === 200 || req.status == 0) {
						resolve(req.responseText);
					} else {
						reject(Error("Failed to load " + filename));
					}
				}
			}
			req.send(null);			
		});
		// fragment shader promise
		promises[i*2 + 1] = new Promise(function(resolve, reject) {
			var req = new XMLHttpRequest();
			var filename = "./shaders/" + fragShaderNames[i] + ".frag";
			req.open("GET", filename, true);
			req.responseType = "text";
			req.onreadystatechange = function () {
				if(req.readyState === 4) {
					if (req.status === 200 || req.status == 0) {
						resolve(req.responseText);
					} else {
						reject(Error("Failed to load " + filename));
					}
				}
			}
			req.send(null);
		});
	}
	Promise.all(promises).then(function(values) {
		postInitShaders(values);
	}, function() {
		console.err("A promise has has rejected, so an XMLHttpRequest failed.");
	});
}

// once shaders load, compile the programs
function postInitShaders(sources) {
	shaders = [];
	programInfo = [];
	for(i = 0; i < sources.length / 2; i++) {
		const shaderProgram = initShaderProgram(gl, sources[i * 2], sources[i * 2 + 1]);
		const info = {
			program: shaderProgram,
			attribLocations: {
				vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
				intensity: gl.getAttribLocation(shaderProgram, 'aVertexColorIntensity'),
				fragNormals: gl.getAttribLocation(shaderProgram, 'fNormal'),
			},
			uniformLocations: {
				mousePosition: gl.getUniformLocation(shaderProgram, 'mousePosition'),
				time: gl.getUniformLocation(shaderProgram, 'time'),
				aspectRatio: gl.getUniformLocation(shaderProgram, 'aspectRatio'),
				rgbSpeed: gl.getUniformLocation(shaderProgram, 'rgbSpeed'),
				lightPosition: gl.getUniformLocation(shaderProgram, "lightPosition"),
				isLightDirectional: gl.getUniformLocation(shaderProgram, "isLightDirectional"),
				mozaicEnabled: gl.getUniformLocation(shaderProgram, "mozaicEnabled"),
				mozaicMinDotAngle: gl.getUniformLocation(shaderProgram, "mozaicMinDotAngle"),
				mozaicTopLeftColor: gl.getUniformLocation(shaderProgram, "mozaicTopLeftColor"),
				mozaicTopRightColor: gl.getUniformLocation(shaderProgram, "mozaicTopRightColor"),
				mozaicBottomLeftColor: gl.getUniformLocation(shaderProgram, "mozaicBottomLeftColor"),
				mozaicBottomRightColor: gl.getUniformLocation(shaderProgram, "mozaicBottomRightColor"),
			}
		};
		shaders[i] = shaderProgram;
		programInfo[i] = info;
	}
	shadersInitialized = true;
}

function initBuffers() {
	const positionBuffer = gl.createBuffer();
	const fragNormalBuffer = gl.createBuffer();
	buffers = {
		position: positionBuffer,
		normals: fragNormalBuffer
	};
	updateBufferData();
}

function updateMozaicData() {
	var mozaicData = computeMozaicData([gridX, gridY]);
	v_vertices = mozaicData.vertices;
	f_normals = mozaicData.normals;
}

function updateBufferData() {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
	if (mozaicEnabled) {
		gl.bufferData(gl.ARRAY_BUFFER,
						new Float32Array(v_vertices),
						gl.STATIC_DRAW);		
	} else {
		gl.bufferData(gl.ARRAY_BUFFER,
						new Float32Array(v_screenvertices),
						gl.STATIC_DRAW);
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
	gl.bufferData(gl.ARRAY_BUFFER,
					new Float32Array(f_normals),
					gl.STATIC_DRAW);
}

function computeMozaicData(dimensions) {
	//var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	var outData = {
		vertices : [],
		height : [],
		normals : []
	}
	for (j = 0; j < dimensions[1]; j++) {
		for (i = 0; i < dimensions[0]; i++) {
			var idx = j * dimensions[0] + i; // index per cell
			var idx_ex = idx * 12; // index per cell (vertex count) 
			var idx_ex3 = idx_ex * 3; // index per cell (vertex count + XYZ coordinates)
			
			// cell coordinates in NDC - TL, BL, TR, BR,
			var cellWidth = 1 / (gridX * 0.5);
			var cellHeight = 1 / (gridY * 0.5);
			var cell = {
				x: i * cellWidth - 1.0,
				y: j * cellHeight - 1.0,
			};
			
			// calculate cell height
			var mp_height;
			var cx = (cell.x + cellWidth / 2 + 1.0) * 0.5;
			var cy = (cell.y + cellHeight / 2 + 1.0) * 0.5;			
			if (uniformCellHeight) {
				mp_height = cellZHeightUniform; 
			} else {
				var h1 = cellZHeightTL * (1.0 - cx) + cellZHeightTR * cx; // linear interpolation between top corners
				var h2 = cellZHeightBL * (1.0 - cx) + cellZHeightBR * cx; // linear interpolation between bottom corners
				mp_height = h2 * (1.0 - cy) + h1 * cy;// linear interpolation between previous two linear interpolations
			}
			
			// vertex coordinates
			var v0 = [cell.x, cell.y, 0.0]; 											// top-left
			var v1 = [cell.x, cell.y + cellHeight, 0.0]; 								// bottom-left
			var v2 = [cell.x + cellWidth, cell.y, 0.0]; 								// top-right
			var v3 = [cell.x + cellWidth, cell.y + cellHeight, 0.0]; 					// bottom-right
			var v4 = [cell.x + cellWidth * 0.5, cell.y + cellHeight * 0.5, mp_height];  // mid-point
			
			// calculate face normals
			var nw = [],
				nn = [],
				ne = [],
				ns = [];
			vec3.cross(nw, [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]], [v4[0] - v0[0], v4[1] - v0[1], v4[2] - v0[2]]); // West tri
			vec3.cross(nn, [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]], [v4[0] - v1[0], v4[1] - v1[1], v4[2] - v1[2]]); // North tri
			vec3.cross(ne, [v2[0] - v3[0], v2[1] - v3[1], v2[2] - v3[2]], [v4[0] - v3[0], v4[1] - v3[1], v4[2] - v3[2]]); // East tri
			vec3.cross(ns, [v0[0] - v2[0], v0[1] - v2[1], v0[2] - v2[2]], [v4[0] - v2[0], v4[1] - v2[1], v4[2] - v2[2]]); // South tri
			vec3.normalize(nw, nw);
			vec3.normalize(nn, nn);
			vec3.normalize(ne, ne);
			vec3.normalize(ns, ns);
						
			// set normals - 3 per face (12 per cell)
			outData.normals[idx_ex3] = nw[0]; 
			outData.normals[idx_ex3 + 1] = nw[1]; 
			outData.normals[idx_ex3 + 2] = nw[2]; 
			outData.normals[idx_ex3 + 3] = nw[0]; 
			outData.normals[idx_ex3 + 4] = nw[1]; 
			outData.normals[idx_ex3 + 5] = nw[2]; 
			outData.normals[idx_ex3 + 6] = nw[0]; 
			outData.normals[idx_ex3 + 7] = nw[1]; 
			outData.normals[idx_ex3 + 8] = nw[2]; 

			outData.normals[idx_ex3 + 9] = nn[0]; 
			outData.normals[idx_ex3 + 10] = nn[1]; 
			outData.normals[idx_ex3 + 11] = nn[2]; 
			outData.normals[idx_ex3 + 12] = nn[0]; 
			outData.normals[idx_ex3 + 13] = nn[1]; 
			outData.normals[idx_ex3 + 14] = nn[2]; 
			outData.normals[idx_ex3 + 15] = nn[0]; 
			outData.normals[idx_ex3 + 16] = nn[1]; 
			outData.normals[idx_ex3 + 17] = nn[2]; 

			outData.normals[idx_ex3 + 18] = ne[0]; 
			outData.normals[idx_ex3 + 19] = ne[1]; 
			outData.normals[idx_ex3 + 20] = ne[2]; 
			outData.normals[idx_ex3 + 21] = ne[0]; 
			outData.normals[idx_ex3 + 22] = ne[1]; 
			outData.normals[idx_ex3 + 23] = ne[2]; 
			outData.normals[idx_ex3 + 24] = ne[0]; 
			outData.normals[idx_ex3 + 25] = ne[1]; 
			outData.normals[idx_ex3 + 26] = ne[2]; 

			outData.normals[idx_ex3 + 27] = ns[0]; 
			outData.normals[idx_ex3 + 28] = ns[1]; 
			outData.normals[idx_ex3 + 29] = ns[2];
			outData.normals[idx_ex3 + 30] = ns[0]; 
			outData.normals[idx_ex3 + 31] = ns[1]; 
			outData.normals[idx_ex3 + 32] = ns[2];
			outData.normals[idx_ex3 + 33] = ns[0]; 
			outData.normals[idx_ex3 + 34] = ns[1]; 
			outData.normals[idx_ex3 + 35] = ns[2];
			
			// set positions - 12 vertices per cell (vs 5 due to flat shading)
			// West triangle v0>v1>v4
			outData.vertices[idx_ex3] = v0[0];
			outData.vertices[idx_ex3 + 1] = v0[1];
			outData.vertices[idx_ex3 + 2] = v0[2];
			outData.vertices[idx_ex3 + 3] = v1[0];
			outData.vertices[idx_ex3 + 4] = v1[1];
			outData.vertices[idx_ex3 + 5] = v1[2];
			outData.vertices[idx_ex3 + 6] = v4[0];
			outData.vertices[idx_ex3 + 7] = v4[1];
			outData.vertices[idx_ex3 + 8] = v4[2];
			
			// South triangle v1>v3>v4
			outData.vertices[idx_ex3 + 9] = v1[0];
			outData.vertices[idx_ex3 + 10] = v1[1];
			outData.vertices[idx_ex3 + 11] = v1[2];
			outData.vertices[idx_ex3 + 12] = v3[0];
			outData.vertices[idx_ex3 + 13] = v3[1];
			outData.vertices[idx_ex3 + 14] = v3[2];
			outData.vertices[idx_ex3 + 15] = v4[0];
			outData.vertices[idx_ex3 + 16] = v4[1];
			outData.vertices[idx_ex3 + 17] = v4[2];

			// East triangle v3>v2>v4
			outData.vertices[idx_ex3 + 18] = v3[0];
			outData.vertices[idx_ex3 + 19] = v3[1];
			outData.vertices[idx_ex3 + 20] = v3[2];
			outData.vertices[idx_ex3 + 21] = v2[0];
			outData.vertices[idx_ex3 + 22] = v2[1];
			outData.vertices[idx_ex3 + 23] = v2[2];
			outData.vertices[idx_ex3 + 24] = v4[0];
			outData.vertices[idx_ex3 + 25] = v4[1];
			outData.vertices[idx_ex3 + 26] = v4[2];
			
			// North triangle v2>v0>v4
			outData.vertices[idx_ex3 + 27] = v2[0];
			outData.vertices[idx_ex3 + 28] = v2[1];
			outData.vertices[idx_ex3 + 29] = v2[2];
			outData.vertices[idx_ex3 + 30] = v0[0];
			outData.vertices[idx_ex3 + 31] = v0[1];
			outData.vertices[idx_ex3 + 32] = v0[2];
			outData.vertices[idx_ex3 + 33] = v4[0];
			outData.vertices[idx_ex3 + 34] = v4[1];
			outData.vertices[idx_ex3 + 35] = v4[2];
		}	
	}
	return outData;
}

// creates a shader of the given type, uploads the source and
// compiles it.
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object
  gl.shaderSource(shader, source);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Initialize a shader program, so WebGL knows how to draw our data
function initShaderProgram(gl, vsSource, fsSource) {	
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
		
  // Create the shader program
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, fragmentShader);
  gl.attachShader(shaderProgram, vertexShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}