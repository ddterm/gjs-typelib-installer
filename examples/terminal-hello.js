#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';

import {findTerminalCommand} from '../gjs-typelib-installer.js';

// #region example
const terminal = await findTerminalCommand();

if (terminal) {
    const argv = terminal(['echo', 'Hello, world!']);
    const [, pid] = GLib.spawn_async(null, argv, null, GLib.SpawnFlags.DEFAULT, null);
    GLib.spawn_close_pid(/** @type {GLib.Pid} */ (pid));
} else {
    printerr('No terminal emulators found');
}
// #endregion example
