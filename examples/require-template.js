#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import {require, MissingDependencies} from '../gjs-typelib-installer.js';

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

    if (ex.packages.size > 0)
        printerr(`Please install the packages: ${[...ex.packages].join(', ')}`);

    if (ex.files.size > 0)
        printerr(`Please install packages that contain the files: ${[...ex.files].join(', ')}`);
}
// #endregion example
