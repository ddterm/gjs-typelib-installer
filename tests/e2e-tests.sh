#!/usr/bin/env bash

# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
SRC_DIR="$(dirname -- "$SCRIPT_DIR")"
BUILD_DIR="${BUILD_DIR:-$SRC_DIR/build}"

if [ "$(id -un)" != testuser ]; then
    echo 'Tests should be run in a podman compose container, as user "testuser"'
    exit 1
fi

startgroup() {
    if [ -n "$GITHUB_ACTIONS" ]; then
        echo "::group::$*"
    else
        echo "----- $* -----"
    fi
}

endgroup() {
    if [ -n "$GITHUB_ACTIONS" ]; then
        echo '::endgroup::'
    else
        echo "-----"
    fi
}

dorun() {
    startgroup "$@"
    local rc=0
    "$@" || rc=$?
    endgroup
    return $rc
}

doconfigure() {
    dorun meson setup --reconfigure "$@" -Dtests=true "${BUILD_DIR#"$PWD/"}" "${SRC_DIR#"$PWD/"}"
    dorun ninja -C "${BUILD_DIR#"$PWD/"}" all meson-test-prereq
}

dotest() {
    dorun meson test -C "${BUILD_DIR#"$PWD/"}" --no-rebuild --print-errorlogs --logbase "$(printf '%s-' "$@")" --test-args "$(printf '%q ' "$@")" e2e-test
}

. /etc/os-release

case "$ID-$VERSION_ID" in
ubuntu-24.04 | ubuntu-25.04 | debian-13)
	SKIP_GTK3=1;&  # Gtk 3 is a dependency of gjs on these distros. Fallthrough!
alpine-3.20.* | alpine-3.21.* | alpine-3.22.* | fedora-* | centos-10 | opensuse-* | arch-*)
	SKIP_FREEDESKTOP=1;;&  # cairo and other are dependencies of gjs
alpine-3.20.* | alpine-3.21.*)
	VTE4_WRONG_PACKAGE=1;;&  # https://gitlab.alpinelinux.org/alpine/aports/-/issues/17029
opensuse-tumbleweed-* | opensuse-leap-16.0)
	SEPARATE_GLIBUNIX=1;;&
esac

set -e

doconfigure '-Dtypelibs=["cairo-1.0"]'

[ "$SKIP_FREEDESKTOP" = "1" ] || dotest cairo-1.0

doconfigure '-Dtypelibs=["GLibUnix-2.0"]'

[ "$SEPARATE_GLIBUNIX" != "1" ] || dotest GLibUnix-2.0

doconfigure '-Dtypelibs=["Pango-1.0","Gtk-3.0","Gdk-3.0","Handy-1"]'

[ "$SKIP_GTK3" = "1" ] || dotest Pango-1.0
[ "$SKIP_GTK3" = "1" ] || dotest Gtk-3.0 Gdk-3.0
dotest Handy-1

doconfigure '-Dtypelibs=["Gtk-4.0","Gdk-4.0","Adw-1"]'

dotest Gtk-4.0 Gdk-4.0
dotest Adw-1

doconfigure '-Dtypelibs=["Vte-2.91","Vte-3.91"]'

if [ "$VTE4_WRONG_PACKAGE" = "1" ]; then
	dotest Vte-2.91 Vte-3.91
else
	dotest Vte-2.91
	dotest Vte-3.91
fi

# reset options, keep test logs
dorun rm -rvf "${BUILD_DIR#"$PWD/"}/"{meson-private,meson-info}

doconfigure

dorun meson test -C "${BUILD_DIR#"$PWD/"}" --no-rebuild --verbose --print-errorlogs test
