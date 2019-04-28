varying float noise;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform float tex1_percentage;
uniform float opacity;

float random(vec3 scale, float seed){
	return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main() {
	// get a random offset
	float r = .01 * random(vec3(12.9898, 78.233, 151.7182), 0.0);
	// lookup vertically in the texture, using noise and offset
	// to get the right RGB colour
	vec2 tPos = vec2(0, 1.0 - 1.3 * noise + r);
	vec4 color = texture2D(tex1, tPos) * tex1_percentage + texture2D(tex2, tPos) * (1.0 - tex1_percentage);
	gl_FragColor = vec4(color.rgb, opacity);
}
