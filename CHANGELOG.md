# Changelog

## 0.6.0
- Added "Color Palette" view to the Run and Debug View of the side bar.
  (requires xsystem35-sdl 2.10.0 or later)

## 0.5.0
- Updated bundled xsys35c to 1.10.0.
- Now "xsys35c: build" should appear in the list of build tasks shown by
  `Ctrl`+`Shift`+`B`.

## 0.4.0
- Show SDK documentation when hovering over System 3.x builtin commands.

## 0.3.1
- Updated bundled xsys35c to 1.9.1.

## 0.3.0
- Now xsys35c (compiler) and xsys35dc (decompiler) are included in the
  extension and no longer need to be installed separately.

## 0.2.1
- The extension is now activated when an `.ADV` file is opened.

## 0.2.0
- Added support for "Go to Definition" for functions.
- The `executable` launch.json property was renamed to `program`. `executable`
  can still be used for backward compatibility.
- Added `env` launch.json property which specifies additional environment
  variables for xsystem35.

## 0.1.0
- Initial release.
