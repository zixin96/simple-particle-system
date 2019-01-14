
/**
 * @fileoverview Sphere - A simple Sphere class
 * @author Zixin Zhang
 */

/** Class implementing 3D terrain. */
class Sphere{
    /**
     * Initialize members of a Sphere object
     */
    constructor(){
        //Radius from 0.05 to 0.1
	    this.radius = Math.random()*0.05 + 0.05;
        //The position of the sphere 
        this.position = vec3.fromValues(Math.random() - 0.5, 
                                       Math.random() - 0.5,
                                       Math.random() - 0.5);
        //Velocity of the sphere
        this.x_v = DEFAULT_SPEED*(Math.random() * 2 - 1);
        this.y_v = DEFAULT_SPEED*(Math.random() * 2 - 1);
        this.z_v = DEFAULT_SPEED*(Math.random() * 2 - 1);
        //Diffuse component
        this.dif_r = Math.random();
        this.dif_g = Math.random();
        this.dif_b = Math.random();
        //Specular component
        this.spe_r = Math.random();
        this.spe_g = Math.random();
        this.spe_b = Math.random();
        //Ambient component
        this.amb_r = Math.random();
        this.amb_g = Math.random();
        this.amb_b = Math.random();
        //Shininess 
        this.shininess = Math.random()*200;
        
    }
    //Get diffuse color components used in shader
    getDiffuseColor(){
        return [this.dif_r, this.dif_g, this.dif_b];
    }
    //Get specular color components used in shader
    getSpeColor(){
        return [this.spe_r, this.spe_g, this.spe_b];
    }
    //Get ambient color components used in shader
    getAmbientColor(){
        return [this.amb_r, this.amb_g, this.amb_b];
    }
    //Update our position of the sphere, including collison handling and updating veloctiy 
    updatePostion(timeStep, drag){
        //X hits the wall
        if (this.position[0] + this.radius >= 1){
            this.x_v = -Math.abs(this.x_v);
        } 
        else if  (this.position[0] - this.radius <= -1){
            this.x_v = Math.abs(this.x_v);
        }
        //Y hits the wall 
        if (this.position[1] + this.radius >= 1){
            this.y_v = -Math.abs(this.y_v);
        }
        else if  (this.position[1] - this.radius <= -1){
            this.y_v = Math.abs(this.y_v);
        }
        //Z hits the wall
        if (this.position[2] + this.radius >= 1){
            this.z_v = -Math.abs(this.z_v);
        }
        else if  (this.position[2] - this.radius <= -1){
            this.z_v = Math.abs(this.z_v);
        }
        //Update velocity with frition (drag force)
        this.x_v *= Math.pow(drag,timeStep);
        this.y_v *= Math.pow(drag,timeStep);
        this.z_v *= Math.pow(drag,timeStep);
        //If y_v is low enough, make it stop
        if(Math.abs(this.y_v) < 0.00001){
            this.y_v = 0;
        }
        
        else {
            //Euler Integration to update velocity
            this.y_v += DEFAULT_G * timeStep;
        }
        //Euler Integration to update position 
        var velocity = vec3.fromValues(this.x_v, this.y_v, this.z_v);
        vec3.scale(velocity, velocity, timeStep);
        vec3.add(this.position, this.position, velocity);
        //If the sphere is stop, we want them stay above the floor 
        if(this.position[1] - this.radius < -1){
            this.position[1] = this.radius - 1.0;
            this.y_v = Math.abs(this.y_v);
        }
    }
    //Setup Sphere Buffer 
    setupSphereBuffers(){
        var sphereSoup=[];
        var sphereNormals=[];
        var numT = sphereFromSubdivision(6, sphereSoup, sphereNormals);
        
        console.log("Generated ", numT, " triangles"); 
        
        sphereVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
        sphereVertexPositionBuffer.itemSize = 3;
        sphereVertexPositionBuffer.numItems = numT * 3;
        console.log(sphereSoup.length / 9);

        // Specify normals to be able to do lighting calculations
        sphereVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                        gl.STATIC_DRAW);
        sphereVertexNormalBuffer.itemSize = 3;
        sphereVertexNormalBuffer.numItems = numT * 3;

        console.log("Normals ", sphereNormals.length / 3);
    }
    
    drawSphere(){
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                            gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                            sphereVertexNormalBuffer.itemSize,
                            gl.FLOAT, false, 0, 0);
        
        setMatrixUniforms();
        gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
    }
    
}