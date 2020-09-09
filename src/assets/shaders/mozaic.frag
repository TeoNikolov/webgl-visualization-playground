precision mediump float;

uniform float mozaicMinDotAngle; // when dot is above this value, a specular reflection is computed
		
varying vec3 color;
varying vec3 fragNormal;
varying vec3 worldPos; // fragment world position
varying vec3 lightPositionFrag; // the light position

float reflectionIntensity = 1.0;

void main() {
	vec3 finalColor = color;
	vec3 lDir = normalize(worldPos - lightPositionFrag);		
	float d = clamp(dot(lDir, fragNormal), 0.0, 1.0); // use lightDir for pronounced edge effect
	if (d > mozaicMinDotAngle) {
		finalColor = color + color * pow((d - mozaicMinDotAngle) / (1.0 - mozaicMinDotAngle), 2.0) * reflectionIntensity;
	}
	gl_FragColor = vec4(finalColor, 1.0);
}