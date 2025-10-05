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
dotest gjs ./install.js Gdk=3.0
dotest gjs ./install.js Gtk=4.0
dotest gjs ./install.js Handy=1 Vte=2.91
dotest gjs ./install.js Adw=1 Vte=3.91
