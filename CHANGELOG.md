# Changelog

## 0.7.3 - 2025-04-26
- Updated sys3c to 0.4.0.

## 0.7.2 - 2025-03-30
- Fixed a bug where the build task was not found immediately after decompilation.
- Updated xsys35c to 1.13.0.

## 0.7.1 - 2025-01-10
- Updated xsys35c to 1.12.0 and sys3c to 0.3.0.

## 0.7.0 - 2024-12-28
- Added support for decompiling / compiling / debugging System 1-3 games.

## 0.6.1 - 2024-03-18
- On Windows, use xsystem35.exe in the workspace folder by default. This is
  currently the recommended way to install it.
- Fixed an issue where the error `Error: there is no registered task type
  'decompile'...` was displayed on the OUTPUT tab.

## 0.6.0 - 2023-12-10
- Added "Color Palette" view to the Run and Debug View of the side bar.
  (requires xsystem35-sdl 2.10.0 or later)

## 0.5.0 - 2023-11-21
- Updated bundled xsys35c to 1.10.0.
- Now "xsys35c: build" should appear in the list of build tasks shown by
  `Ctrl`+`Shift`+`B`.

## 0.4.0 - 2023-07-04
- Show SDK documentation when hovering over System 3.x builtin commands.

## 0.3.1 - 2023-01-26
- Updated bundled xsys35c to 1.9.1.

## 0.3.0 - 2022-11-06
- Now xsys35c (compiler) and xsys35dc (decompiler) are included in the
  extension and no longer need to be installed separately.

## 0.2.1 - 2022-01-04
- The extension is now activated when an `.ADV` file is opened.

## 0.2.0 - 2021-11-28
- Added support for "Go to Definition" for functions.
- The `executable` launch.json property was renamed to `program`. `executable`
  can still be used for backward compatibility.
- Added `env` launch.json property which specifies additional environment
  variables for xsystem35.

## 0.1.0 - 2021-11-12
- Initial release.
