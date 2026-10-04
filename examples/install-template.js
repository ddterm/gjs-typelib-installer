#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import System from 'system';
import GLib from 'gi://GLib';

import {require, findTerminalInstallCommand, MissingDependencies} from '../gjs-typelib-installer.js';

// #region example
/** @import TemplateMod from '@girs/template-1.0' */

try {
    const {Template} = /** @type {{Template: TemplateMod}} */ (require({Template: '1.0'}));

    const t = Template.Template.new(null);
    t.parse_string('2 + 2 = {{ 2 + 2 }}');
    print(t.expand_string(null));
} catch (ex) {
    if (!(ex instanceof MissingDependencies))
        throw ex;

    // For simplicity, we start the installation process immediately here.
    // But usually it's a good idea to have an "Install" button that the user can click,
    // or ask for confirmation.

    const installer = await findTerminalInstallCommand();

    if (!installer) {
        printerr("Can't install packages");
        System.exit(1);
    }

    if (ex.packages.size === 0) {
        printerr("Can't find a package with Template-GLib for this OS");
        System.exit(1);
    }

    const argv = installer(ex.packages);
    const [, pid] = GLib.spawn_async(null, argv, null, GLib.SpawnFlags.DEFAULT, null);
    GLib.spawn_close_pid(/** @type {GLib.Pid} */ (pid));

    // Note: there's no reliable way to wait for package installation to complete.
    // Exit with an error, and ask the user to restart the app/enable the extension again.
    printerr('Please, try again after installing the package');
    System.exit(1);
}
// #endregion example
