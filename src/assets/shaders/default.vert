uniform vec3 lightPosition;
uniform bool isLightDirectional;
uniform vec3 mozaicTopLeftColor;
uniform vec3 mozaicTopRightColor;
uniform vec3 mozaicBottomLeftColor;
uniform vec3 mozaicBottomRightColor;

attribute vec3 aVertexPosition; // z is toward/away from the screen in NDC
attribute vec3 fNormal;

varying vec2 pos;
varying vec3 color;
varying vec3 fragNormal;
varying vec3 worldPos; // for fragment shader, world position of fragment
varying vec3 lightDir;
varying vec3 lightPositionFrag;

void main() {
	gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, aVertexPosition.z, 1.0);
	pos = vec2(aVertexPosition.x, aVertexPosition.y);
	fragNormal = fNormal;
	worldPos = aVertexPosition;
	
	float normalizedX = aVertexPosition.x * 0.5 + 0.5;
	float normalizedY = aVertexPosition.y * 0.5 + 0.5;
	vec3 colorInterpolantA = mozaicTopLeftColor * (1.0 - normalizedX) + mozaicTopRightColor * normalizedX;
	vec3 colorInterpolantB = mozaicBottomLeftColor * (1.0 - normalizedX) + mozaicBottomRightColor * normalizedX;
	vec3 colorInterpolated = colorInterpolantB * (1.0 - normalizedY) + colorInterpolantA * normalizedY;
	
	// float r = aVertexPosition.x * 0.5 + 0.5;
	// float g = aVertexPosition.y * 0.5 + 0.5;
	// float b = 1.0;
	//float b = -aVertexPosition.x * 0.5 - aVertexPosition.y * 0.5;
	
	// calculate directional light direction
	if (isLightDirectional) {
		lightDir = vec3(-lightPosition.x, -lightPosition.y, -lightPosition.z);
	} else {
		lightDir = vec3(aVertexPosition) - lightPosition;
	}
	lightDir = normalize(lightDir);
	lightPositionFrag = lightPosition;
	vec3 lightVertexDiff = lightPosition - aVertexPosition;
	float inverseSquareLawAmount = 1.0;
	float intensityAtPoint = 1.0 - inverseSquareLawAmount + inverseSquareLawAmount * 1.0 / (dot(lightVertexDiff, lightVertexDiff));
	float intensity = 0.45 + 0.55 * intensityAtPoint * clamp(dot(lightDir, fNormal), 0.0, 1.0);
	
	color = colorInterpolated * intensity;
}