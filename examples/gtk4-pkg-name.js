#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import {packages} from '../gjs-typelib-installer.js';

// #region example
const gtk = packages.Gtk['4.0']().packages;

if (gtk)
    print(`To install Gtk 4.0 typelib, install the following package(s): ${gtk.join(', ')}`);
else
    printerr("Can't find a Gtk 4.0 package for this OS");
// #endregion example
