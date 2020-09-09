attribute vec3 aVertexPosition; // NDC | z is away from screen

varying vec3 worldPos; // pass the vertex coordinates directly - cleaner and more efficient

void main() {
	worldPos = aVertexPosition;
	gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, aVertexPosition.z, 1.0);
}