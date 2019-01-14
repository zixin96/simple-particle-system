//array to hold our spheres
var spheres = [];

var mySphere;

//Default values
var DEFAULT_ACCELERATION = 10.0;
var DEFAULT_SPEED = 5.0;
var DEFAULT_DRAG = 0.7;
var DEFAULT_G = -13.0;

//Last time we draw the sphere 
var pre_draw;

// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Create a place to store normals for shading
var sphereVertexNormalBuffer;

var cubeVertexPositionBuffer;
var cubeVertexNormalBuffer;
var cubeVertexFaceBuffer;


/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,-0.05,5.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

//Held down keys for interactivity
var currentlyPressedKeys = {};

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
	mat3.normalFromMat4(nMatrix,mvMatrix);
	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
	var copy = mat4.clone(mvMatrix);
	mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
	if (mvMatrixStack.length == 0) {
		throw "Invalid popMatrix!";
	}
	mvMatrix = mvMatrixStack.pop();
}
//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}
//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
	uploadModelViewMatrixToShader();
	uploadNormalMatrixToShader();
	uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
	var names = ["webgl", "experimental-webgl"];
	var context = null;
	for (var i=0; i < names.length; i++) {
		try {
			context = canvas.getContext(names[i]);
		} catch(e) {}
		if (context) {
			break;
		}
	}
	if (context) {
		context.viewportWidth = canvas.width;
		context.viewportHeight = canvas.height;
	} else {
		alert("Failed to create WebGL context!");
	}
	return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
	var shaderScript = document.getElementById(id);
	
	// If we don't find an element with the specified id
	// we do an early exit 
	if (!shaderScript) {
		return null;
	}
	
	// Loop through the children for the found DOM element and
	// build up the shader source code as a string
	var shaderSource = "";
	var currentChild = shaderScript.firstChild;
	while (currentChild) {
		if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
			shaderSource += currentChild.textContent;
		}
		currentChild = currentChild.nextSibling;
	}
 
	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}
 
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);
 
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	} 
	return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
	vertexShader = loadShaderFromDOM("shader-vs");
	fragmentShader = loadShaderFromDOM("shader-fs");
	
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Failed to setup shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aNormal");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
	shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
	shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
	shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
	shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
	shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
	shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");
	shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess"); 

}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color 
 * @param {Float32} the shininess exponent for Phong illumination
 */
function uploadMaterialToShader(dcolor, acolor, scolor,shiny) {
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, dcolor);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, acolor);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, scolor);
    
  gl.uniform1f(shaderProgram.uniformShininess, shiny);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
	gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
	gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
	gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
	gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

function setupCubeBuffers(){
    // Create a buffer for cube's vertices.
  cubeVertexPositionBuffer = gl.createBuffer();

  // Bind cubeVertexPositionBuffer

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);

  var vertices = [

  
  // Bottom face
  -1.0, -1.0, -1.0,
   1.0, -1.0, -1.0,
   1.0, -1.0,  1.0,
  -1.0, -1.0,  1.0,
  

  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.

  cubeVertexFaceBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexFaceBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23,   // left
  ]

  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

  cubeVertexNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);

  gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array(vertices), gl.STATIC_DRAW);
}

function drawCube(){
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Bind normal buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);   

  // Draw the cube.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexFaceBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

//Populate buffers with data
function setupBuffers(){
    mySphere = new Sphere();
    mySphere.setupSphereBuffers();
    setupCubeBuffers();
}

function draw(){
    var transformVec = vec3.create();
    
    var lightVec = vec3.fromValues(1,1,1);
    
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
    
    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);
    
    mvPushMatrix();
    vec3.transformMat4(lightVec, lightVec, mvMatrix)
    uploadLightsToShader([lightVec[0],lightVec[1],lightVec[2]],[0.5,0.5,0.5],[1.0,1.0,1.0],[0.0,0.0,0.0]);
    //Draw Spheres in the array
    for(var i = 0; i < spheres.length; i++){
        mvPushMatrix();
        var s = spheres[i];
        //Move the sphere into correct space
        mat4.translate(mvMatrix, mvMatrix, s.position);
		vec3.set(transformVec, s.radius, s.radius, s.radius);
		mat4.scale(mvMatrix, mvMatrix, transformVec);
        //Upload material color 
        uploadMaterialToShader(s.getDiffuseColor(),
                              s.getAmbientColor(),
                              s.getSpeColor(),
                              s.shininess);
        
        s.drawSphere();
        mvPopMatrix();
    }
    //make the bottom
	uploadMaterialToShader([0.0,0.0,0.0],[0.0,0.0,0.0],[0.0,0.0,0.0], 50);
	//draw the floor
	drawCube();
    mvPopMatrix();
}

function animate(){
    var timeStep = (Date.now() - pre_draw) / 1000;
    pre_draw = Date.now();
    //Update position of the sphere using friction 
    for(var i = 0; i < spheres.length; i++){
        spheres[i].updatePostion(timeStep, DEFAULT_DRAG);
    }
}
//Add three more sphere every time we click the mouse
function addParticles(){
    spheres.push(new Sphere());
    spheres.push(new Sphere());
    spheres.push(new Sphere());
}
//Clear all the balls in the scene 
function reset(){
    for(var i = 0; i < spheres.length; i++){
        spheres[i] = null;
    }
    spheres = [];
}


function handleKeyDown(event) {
	currentlyPressedKeys[event.keyCode] = true;
}


function handleKeyUp(event) {
	currentlyPressedKeys[event.keyCode] = false;
}

function handleKeys(){
    //r key - clear the balls
	if (currentlyPressedKeys[82]){
		reset();
	}
}

function startup(){
    canvas = document.getElementById("myGLCanvas");
    document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;
    gl = createGLContext(canvas);
    setupShaders();
	setupBuffers();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    //Start with 3 spheres
    for(var i = 0; i < 3; i++){
        spheres.push(new Sphere());
    }
    pre_draw = Date.now();
    tick();
}

function tick(){
    requestAnimFrame(tick);
    draw();
    handleKeys();
    animate();
}
