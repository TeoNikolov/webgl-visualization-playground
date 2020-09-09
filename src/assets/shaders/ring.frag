precision mediump float;

uniform float time;
uniform float aspectRatio;
uniform vec3 rgbSpeed;
uniform vec2 ringPosition; // NDC

varying vec2 worldPos; // fragment world position

float outerRadius = 0.1;
float innerRadius = 0.5;
float curveExp = 1.5;
float colorIntensity = 0.5;

void main() {
	vec2 delta = vec2((worldPos.x - ringPosition.x) * aspectRatio, worldPos.y - ringPosition.y);
	//float invOR = 1.0 / outerRadius;
	//float p = (1.0 - length(delta)) * invOR + 1.0 - invOR + innerRadius * invOR;
	float p = 1.0 / outerRadius * (innerRadius - length(delta)) + 1.0; // rearranged
	if (p < 0.0) { p = 0.0; } else if (p > 1.0) { p = 1.0; }
	float p3 = pow(p, curveExp);
	
	// donut
	float r = ((1.0 - pos.x) * 0.5 * time * rgbSpeed.x);
	float g = ((1.0 - pos.y) * 0.5 * time * rgbSpeed.y);
	float b = ((pos.x + 1.0) * 0.25 + (1.0 - pos.y) * 0.25) * (time * rgbSpeed.z);
	float finalR = r * colorIntensity * (1.0 - p3) * p;
	float finalG = g * colorIntensity * (1.0 - p3) * p;
	float finalB = b * colorIntensity * (1.0 - p3) * p;
	gl_FragColor = vec4(finalR, finalG, finalB, 1.0);
}