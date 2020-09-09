uniform vec3 lightPosition;
uniform bool isLightDirectional;
uniform vec3 mozaicTopLeftColor;
uniform vec3 mozaicTopRightColor;
uniform vec3 mozaicBottomLeftColor;
uniform vec3 mozaicBottomRightColor;

attribute vec3 aVertexPosition; // NDC | z is away from screen
attribute vec3 fNormal;

varying vec3 color;
varying vec3 fragNormal;
varying vec3 worldPos;
varying vec3 lightPositionFrag; // the light position

float inverseSquareLawAmount = 1.0;

void main() {
	// interpolate between the four corner colors
	float normalizedX = aVertexPosition.x * 0.5 + 0.5;
	float normalizedY = aVertexPosition.y * 0.5 + 0.5;
	vec3 colorInterpolantA = mozaicTopLeftColor * (1.0 - normalizedX) + mozaicTopRightColor * normalizedX;
	vec3 colorInterpolantB = mozaicBottomLeftColor * (1.0 - normalizedX) + mozaicBottomRightColor * normalizedX;
	vec3 colorInterpolated = colorInterpolantB * (1.0 - normalizedY) + colorInterpolantA * normalizedY;
	
	// calculate directional light direction
	vec3 lightDir;
	if (isLightDirectional) {
		// light direction is towards (0,0) coordinate
		lightDir = normalize(vec3(-lightPosition.x, -lightPosition.y, -lightPosition.z));
	} else {
		lightDir = normalize(vec3(aVertexPosition) - lightPosition);
	}
	vec3 lightVertexDiff = lightPosition - aVertexPosition;
	float intensityAtPoint = 1.0 - inverseSquareLawAmount + inverseSquareLawAmount * 1.0 / (dot(lightVertexDiff, lightVertexDiff));
	float intensity = 0.45 + 0.55 * intensityAtPoint * clamp(dot(lightDir, fNormal), 0.0, 1.0);
	
	color = colorInterpolated * intensity;
	fragNormal = fNormal;
	worldPos = aVertexPosition;
	lightPositionFrag = lightPosition;
	gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, aVertexPosition.z, 1.0);
}