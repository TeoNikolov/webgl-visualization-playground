precision mediump float;

uniform float time;
uniform float aspectRatio;
uniform vec3 rgbSpeed;
uniform vec2 mousePosition; // normalized to device coordinates
uniform bool mozaicEnabled;
uniform float mozaicMinDotAngle; // when dot is above this value, the light reflection is computed
		
varying vec3 fragNormal;
varying vec2 pos;
varying vec3 color;
varying vec3 worldPos; // world position of fragment
varying vec3 lightDir;
varying vec3 lightPositionFrag;

float outerRadius = 0.1;
float innerRadius = 0.5;
float curveExp = 1.5;

void main() {
	if (mozaicEnabled) {
		// mozaic
		vec3 finalColor;
		vec3 lDir = normalize(worldPos - lightPositionFrag);		
		float d = clamp(dot(lDir, fragNormal), 0.0, 1.0); // use lightDir for pronounced edge effect
		float reflectionIntensity = 1.0;
		if (d > mozaicMinDotAngle) {
			finalColor = color + color * pow((d - mozaicMinDotAngle) / (1.0 - mozaicMinDotAngle), 2.0) * reflectionIntensity;
		} else {
			finalColor = color;
		}
		gl_FragColor = vec4(finalColor, 1.0);
	} else {	
		vec2 delta = vec2((pos.x - mousePosition.x) * aspectRatio, pos.y - mousePosition.y);
		//float invOR = 1.0 / outerRadius;
		//float p = (1.0 - length(delta)) * invOR + 1.0 - invOR + innerRadius * invOR;
		float p = 1.0 / outerRadius * (innerRadius - length(delta)) + 1.0; // rearranged
		if (p < 0.0) { p = 0.0; } else if (p > 1.0) { p = 1.0; }
		float p3 = pow(p, curveExp);
		float colorIntensity = 0.5;
		
		// flat donut
		// vec3 rgbStep = vec3(1.0 / rgbSpeed.x, 1.0 / rgbSpeed.y, 1.0 / rgbSpeed.z);
		// float rrr = 0.5 + abs(time / rgbSpeed.x - floor(time / rgbSpeed.x + 1.0 / 2.0));
		// float ggg = 0.5 + abs(time / rgbSpeed.y - floor(time / rgbSpeed.y + 1.0 / 2.0));
		// float bbb = 1.0 + abs(time / rgbSpeed.z - floor(time / rgbSpeed.z + 1.0 / 2.0));
		// gl_FragColor = vec4(rrr * colorIntensity * p3, ggg * colorIntensity * p3, bbb * colorIntensity * p3, 1.0);	
		
		// donut
		float r = ((1.0 - pos.x) * 0.5 * time * rgbSpeed.x);
		float g = ((1.0 - pos.y) * 0.5 * time * rgbSpeed.y);
		float b = ((pos.x + 1.0) * 0.25 + (1.0 - pos.y) * 0.25) * (time * rgbSpeed.z);
		float finalR = r * colorIntensity * (1.0 - p3) * p;
		float finalG = g * colorIntensity * (1.0 - p3) * p;
		float finalB = b * colorIntensity * (1.0 - p3) * p;
		gl_FragColor = vec4(finalR, finalG, finalB, 1.0);	
	}	
}