/** Original single-pass GLSL preset, loaded locally into RetroArch's own renderer.
 * No canvas copying, network dependency or changes to emulator state. */
export function sharpShaderFiles() {
  return [
    { fileName: "emurm-sharp.glslp", fileContent: new Blob(['shaders = "1"\nshader0 = "shaders/emurm-sharp.glsl"\nfilter_linear0 = "false"\n']) },
    { fileName: "emurm-sharp.glsl", fileContent: new Blob([`
#ifdef GL_ES
precision mediump float;
#endif
#if defined(VERTEX)
attribute vec4 VertexCoord;
attribute vec4 TexCoord;
uniform mat4 MVPMatrix;
varying vec2 uv;
void main() { gl_Position = MVPMatrix * VertexCoord; uv = TexCoord.xy; }
#elif defined(FRAGMENT)
uniform sampler2D Texture;
uniform vec2 TextureSize;
varying vec2 uv;
void main() {
  vec2 t = 1.0 / TextureSize;
  vec3 c = texture2D(Texture, uv).rgb;
  vec3 n = (texture2D(Texture, uv + vec2(t.x, 0.0)).rgb
    + texture2D(Texture, uv - vec2(t.x, 0.0)).rgb
    + texture2D(Texture, uv + vec2(0.0, t.y)).rgb
    + texture2D(Texture, uv - vec2(0.0, t.y)).rgb) * 0.25;
  gl_FragColor = vec4(clamp(c + clamp(c - n, vec3(-0.08), vec3(0.08)) * 0.35, 0.0, 1.0), 1.0);
}
#endif
`]) },
  ];
}
