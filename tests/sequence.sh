#!/bin/sh

# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

dotest() {
	echo "::group::$*"
	"$@"
	echo '::endgroup::'
}

set -e

dotest gjs ./install.js Pango=1.0
dotest gjs ./install.js Gtk=3.0 Gdk=3.0
dotest gjs ./install.js Handy=1
dotest gjs ./install.js Gtk=4.0 Gdk=4.0
dotest gjs ./install.js Adw=1
dotest gjs ./install.js Vte=2.91
dotest gjs ./install.js Vte=3.91
