#!/bin/sh

# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

dotest() {
	echo "::group::$*"
	"$@"
	echo '::endgroup::'
}

. /etc/os-release

case "$ID-$VERSION_ID" in
ubuntu-24.04 | ubuntu-25.04 | debian-*)
	SKIP_GTK3=1;;  # Gtk 3 is a dependency of gjs on these distros
alpine-3.19.* | alpine-3.20.* | alpine-3.21.*)
	BROKEN_VTE4=1;;  # https://gitlab.alpinelinux.org/alpine/aports/-/issues/17029
esac

set -e

../generate-resolver.js ../resolver.js /tmp/resolver.min.js Pango=1.0 Gtk=3.0 Gdk=3.0 Gtk=4.0 Gdk=4.0 Handy=1 Adw=1 Vte=2.91 Vte=3.91

[ "$SKIP_GTK3" = "1" ] || dotest ./yes.expect ./install.js file:///tmp/resolver.min.js Pango=1.0
[ "$SKIP_GTK3" = "1" ] || dotest ./yes.expect ./install.js file:///tmp/resolver.min.js Gdk=3.0

dotest ./yes.expect ./install.js file:///tmp/resolver.min.js Gtk=4.0
dotest ./yes.expect ./install.js file:///tmp/resolver.min.js Handy=1 Vte=2.91

if [ "$BROKEN_VTE4" = "1" ]; then
	dotest ./yes.expect ./install.js file:///tmp/resolver.min.js Adw=1
else
	dotest ./yes.expect ./install.js file:///tmp/resolver.min.js Adw=1 Vte=3.91
fi
