# System 3.x extension for Visual Studio Code

This is a work-in-progress VS Code extension that adds support for the
AliceSoft's System 3.x language.

## Features

- Syntax highlighting for `.ADV` source files
- Decompiling and Compiling (using [xsys35c])
- Debugging (using [xsystem35-sdl2])

## Prerequisites

This extension requires unreleased versions of [xsys35c] and [xsystem35-sdl2].
You need to build and install them from source code.

## Getting Started

Once you've satisfied the prerequisites, perform the following steps to get
started:

1. Install [this extension](https://marketplace.visualstudio.com/items?itemName=kichikuou.system3x)
   and reload VS Code.
2. Open a folder that contains System3.x game files (`*.ALD`).
3. If prompted, specify `xsys35c` / `xsys35dc` / `xsystem35` locations. See
   [below](#extension-settings) for details.
4. Open the command palette (`Ctrl+Shift+P` or `F1`), and enter `system3x`.
   Select `System3x: Decompile` from the completion list. Decompiled source
   files will be generated in the `src` folder, and this extension opens the
   first `ADV` file automatically.
5. Press `F5`. The debugger starts, ant pauses at the first instruction. See
   [VS Code's debugging document](https://code.visualstudio.com/docs/editor/debugging)
   for how to use the debugger.

## Extension Settings

If you installed `xsys35c` and `xsystem35-sdl2` in your system `PATH`, no
configuration is needed.

Otherwise, you need to set the paths to those executables. This extension
prompts you to choose executable files if those commands are not found.

You can also specify paths to those commands with the following settings:
- `system3x.xsys35cPath`
- `system3x.xsys35dcPath`
- `system3x.xsystem35Path`

## Feature details

TODO: write


[xsys35c]: https://github.com/kichikuou/xsys35c
[xsystem35-sdl2]: https://github.com/kichikuou/xsystem35-sdl2
