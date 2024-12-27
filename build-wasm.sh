#!/bin/sh

set -e

test -e xsys35c/meson.build || git submodule update --init
test -e xsys35c/wasm/build.ninja || meson setup --cross-file=xsys35c/misc/emscripten.ini --buildtype=release xsys35c/wasm xsys35c
ninja -C xsys35c/wasm
cp xsys35c/wasm/xsys35{c,dc}.{js,wasm} out/

test -e sys3c/meson.build || git submodule update --init
test -e sys3c/wasm/build.ninja || meson setup --cross-file=sys3c/misc/emscripten.ini --buildtype=release sys3c/wasm sys3c
ninja -C sys3c/wasm
cp sys3c/wasm/sys3{c,dc}.{js,wasm} out/
