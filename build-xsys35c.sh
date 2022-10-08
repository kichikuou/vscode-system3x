#!/bin/sh

set -e

test -e xsys35c/meson.build || git submodule update --init
cd xsys35c
test -e wasm/build.ninja || meson --cross-file=misc/emscripten.ini --buildtype=release wasm
ninja -C wasm
cp wasm/xsys35{c,dc}.{js,wasm} ../out/
