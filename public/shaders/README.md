# Bundled GLSL shaders

Single-pass presets from [libretro/glsl-shaders](https://github.com/libretro/glsl-shaders):
`crt-pi`, `crt-lottes`, `crt-easymode`, `crt-geom` (CRT), `lcd3x` (handheld LCD),
`fxaa` (edge smoothing) and `pixel-aa` (crisp pixel-perfect upscaling).
Each file keeps its original author and licence header — `fxaa.glsl` is NVIDIA's
permissive FXAA 3.11 Console shader, `pixel-aa.glsl` is "Pixel AA" by fishku,
public domain (CC0). `pixel-aa.glslp`'s `shader0` path was adjusted from the
upstream repo's nested `shaders/pixel_aa/pixel_aa_single_pass.glsl` to the flat
`shaders/pixel-aa.glsl` to match this directory's layout; the shader source
itself is unmodified. All other files are unmodified.
These are GLSL for RetroArch's WebGL renderer; the sibling `slang-shaders` repo
(what native RetroArch builds and apps like PCSX-ReARMed on iOS use) targets
Vulkan/Metal/D3D only and cannot run in a browser.
