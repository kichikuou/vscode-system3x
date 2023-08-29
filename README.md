# System 3.x Extension for Visual Studio Code

This extension adds support for AliceSoft's System 3.x language.

![Screenshot](images/debugger.png)

## Features

- Syntax highlighting for `.ADV` source files
- Documentation appears when you hover over a command name
- [Go to Definition](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-definition)
  for functions
- Decompiling and compiling (using the bundled [xsys35c])
- Debugging (using [xsystem35-sdl2])

## Prerequisites

- To view command documentation, you'll need the
  [System 3.9 SDK](https://web.archive.org/web/20021018163909/http://www.alicesoft.co.jp/support/sys39agr.html).
- To use debugging features, you'll need [xsystem35-sdl2] (version 2.0.0 or
  higher).

## Getting Started

After meeting the prerequisites, follow these steps to get started:

1. Install [this extension](https://marketplace.visualstudio.com/items?itemName=kichikuou.system3x).
2. Open a folder containing System 3.x game files (`*.ALD`).
3. If prompted, specify the `xsystem35` location. See
   [below](#extension-settings) for details.
4. Open the command palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> or
   <kbd>F1</kbd>), and enter `system3x`. Select `System3x: Decompile` from the
   list that appears. Decompiled source files will be saved in the `src`
   folder, and this extension will automatically open the first `.ADV` file.
5. Press <kbd>F5</kbd> to start debugging.

## Extension Settings

To access your settings, open the Settings editor (`Ctrl+,` or `Cmd+,`) and
search for `system3x`. To unlock the full functionality of this extension, you
should at least set the `Xsystem35 Path` and `Manual Path`. If these settings
are not already configured, the extension will prompt you to do so.

## Feature Details

### Decompiling

The `System3x: Decompile` command decompiles System 3.x game files (`*.ALD` and
`System39.ain`) located in the workspace folder. This command generates
decompiled source files in a `src` subfolder.

### Compiling

By default, the `Start Debugging` command (<kbd>F5</kbd>) automatically
rebuilds the game using source files in the `src` folder.

To build the game without running it, select `Configure Default Build Task`
from the `Terminal` menu and choose `xsys35c: build`. This action will generate
a `tasks.json` file. You can then use the `Run Build Task` command
(<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>) to build the game.

### Running

If a `launch.json` file doesn't exist, pressing <kbd>F5</kbd> will start
xsystem35 (the game engine) with default settings. But this works only when an
`.ADV` file is open in the current tab.

To make <kbd>F5</kbd> consistently functional, or to customize launch settings,
select `Add Configuration` from the `Run` menu. This will generate a
`launch.json` file as follows:

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

Mouse hovering over the attributes will display their descriptions.

For example, to launch the game without building it, comment out the
`"preLaunchTask": "xsys35c: build"` line.

### Debugging

Refer to the [Debugging](https://code.visualstudio.com/docs/editor/debugging)
documentation in VS Code to learn how to use the debugger.

The System 3.x debugger supports the following operations:
- [Breakpoints](https://code.visualstudio.com/docs/editor/debugging#_breakpoints)
- [Conditional breakpoints](https://code.visualstudio.com/docs/editor/debugging#_advanced-breakpoint-topics)
- [Step-through execution](https://code.visualstudio.com/docs/editor/debugging#_debug-actions)
- [Data inspection](https://code.visualstudio.com/docs/editor/debugging#_data-inspection)
- [Debug console REPL](https://code.visualstudio.com/docs/editor/debugging#_debug-console-repl)


[xsys35c]: https://github.com/kichikuou/xsys35c
[xsystem35-sdl2]: https://github.com/kichikuou/xsystem35-sdl2
