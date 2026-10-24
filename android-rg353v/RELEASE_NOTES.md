## EmuRM RG353V Edition v1.0

A native, offline game **launcher** for the ANBERNIC RG353V (Android 11, 640x480). Install `EmuRM-RG353V-v1.0.apk`.

**What it is:** a fast frontend. It organizes your own game files (internal storage or microSD, via Android's folder picker) and starts them in an emulator app installed on the device. It does **not** bundle emulators or games.

**Needs on the device:** RetroArch (aarch64) with the relevant cores downloaded, and/or PPSSPP, DraStic, melonDS, Flycast, DuckStation, M64Plus FZ.

Honest status: built and unit-tested in CI; **not yet tested on a real RG353V**. RetroArch and PPSSPP launch methods follow their documented intents; the other emulators use a generic "open file" intent that may need adjusting.

Developed by abu00salman.
