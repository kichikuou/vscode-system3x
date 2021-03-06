# System 3.x extension for Visual Studio Code

This extension adds support for the AliceSoft's System 3.x language.

![Screenshot](images/debugger.png)

## Features

- Syntax highlighting for `.ADV` source files
- [Go to Definition](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-definition)
  for functions
- Decompiling and Compiling (using [xsys35c])
- Debugging (using [xsystem35-sdl2])

## Prerequisites

To use the full functionality of this extension, you will need the following
software:

- [xsys35c] (>= 1.7.0)
- [xsystem35-sdl2] (>= 2.0.0)

### Windows

- Download latest Windows release of xsys35c from
  [here](https://github.com/kichikuou/xsys35c/releases), and unpack it.
- Download latest Windows installer of xsystem35-sdl2 from
  [here](https://github.com/kichikuou/xsystem35-sdl2/releases), and install it.

### Mac / Linux

See README of [xsys35c] and [xsystem35-sdl2] for build and install instructions.

## Getting Started

Once you've satisfied the prerequisites, perform the following steps to get
started:

1. Install [this extension](https://marketplace.visualstudio.com/items?itemName=kichikuou.system3x).
2. Open a folder that contains System3.x game files (`*.ALD`).
3. If prompted, specify `xsys35c` / `xsys35dc` / `xsystem35` locations. See
   [below](#extension-settings) for details.
4. Open the command palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> or
   <kbd>F1</kbd>), and enter `system3x`. Select `System3x: Decompile` from the
   completion list. Decompiled source files will be generated in the `src`
   folder, and this extension opens the first `ADV` file automatically.
5. Press <kbd>F5</kbd> to start the debugger.

## Extension Settings

If you installed `xsys35c` and `xsystem35-sdl2` in your system `PATH`, no
configuration is needed.

Otherwise, you need to set the paths to those executables. This extension
prompts you to choose executable files if those commands are not found.

You can also specify paths to those commands with the following settings:
- `system3x.xsys35cPath`
- `system3x.xsys35dcPath`
- `system3x.xsystem35Path`

## Feature Details

### Decompiling

The `System3x: Decompile` command decompiles System 3.x game files (`*.ALD` and
`System39.ain`) in the workspace folder. It creates `src` subfolder and
generates decompiled source files into it.

### Compiling

By default, the `Start Debugging` command (<kbd>F5</kbd>) automatically
rebuilds the game from source files in the `src` folder.

If you want to build the game without running it, select `Configure Default
Build Task` from the `Terminal` menu, and select `xsys35c: build`. This will
generate a `tasks.json` file. Now you can use the `Run Build Task` command
(<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>) to build the game.

### Running

If there is no `launch.json` file, the `Start Debugging` command
(<kbd>F5</kbd>) will start xsystem35 (the game engine) with default settings.
This works only when an `.ADV` file is open in the current tab.

To make <kbd>F5</kbd> always work, or to customize the launch settings, select
`Add Configuration` from the `Run` menu. This will generate a `launch.json`
file like this:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "xsystem35",
            "request": "launch",
            "name": "Debug",
            "program": "${config:system3x.xsystem35Path}",
            "runDir": "${workspaceFolder}",
            "srcDir": "${workspaceFolder}/src",
            "logLevel": 1,
            "stopOnEntry": false,
            "preLaunchTask": "xsys35c: build"
        }
    ]
}
```
Mouse hover will show descriptions of the attributes.

For example, if you want to launch the game without building it, comment out
the `"preLaunchTask": "xsys35c: build"` field.

### Debugging

See the [Debugging](https://code.visualstudio.com/docs/editor/debugging)
document of VS Code for how to use the debugger.

The System3.x debugger supports following operations:
- [Breakpoints](https://code.visualstudio.com/docs/editor/debugging#_breakpoints)
  (including [Conditional breakpoints](https://code.visualstudio.com/docs/editor/debugging#_advanced-breakpoint-topics))
- [Step executions](https://code.visualstudio.com/docs/editor/debugging#_debug-actions)
- [Data inspection](https://code.visualstudio.com/docs/editor/debugging#_data-inspection)
- [Debug console REPL](https://code.visualstudio.com/docs/editor/debugging#_debug-console-repl)


[xsys35c]: https://github.com/kichikuou/xsys35c
[xsystem35-sdl2]: https://github.com/kichikuou/xsystem35-sdl2
