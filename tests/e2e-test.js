#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

/** @import GIRepository2 from '@girs/girepository-2.0' */
/** @import GIRepository3 from '@girs/girepository-3.0' */

import GIRepository from 'gi://GIRepository';

import System from 'system';

/** @import {TypelibResolver} from '../gjs-typelib-installer.js' */

const GNU_SKIP_RETURNCODE = 77;
const GNU_ERROR_RETURNCODE = 99;

/**
 * @param {string} srcPath
 * @param {string[]} typelibs
 */
async function main(srcPath, typelibs) {
    /** @type {import('../gjs-typelib-installer.js')} */
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
    const installer = await import(GLib.filename_to_uri(srcPath, null));

    /** @type {Record<string, string>} */
    const versions = {};

    for (const arg of typelibs) {
        const [namespace, version, ...extra] = arg.split('-');

        if (!version || extra.length) {
            printerr(`Invalid argument ${arg}: should be in "Namespace-version" format, for example: Gtk-3.0`);
            return GNU_ERROR_RETURNCODE;
        }

        versions[namespace] = version;
    }

    try {
        installer.require(versions);

        throw new Error(`Unexpected: import succeeded: ${JSON.stringify(versions)}`);
    } catch (error) {
        if (!(error instanceof installer.MissingDependencies))
            throw error;

        if (error.files.size > 0)
            throw new Error(`Unresolved files: ${error.message}`, {cause: error});

        const command = await installer.findInstallCommand();

        if (!command)
            throw new Error('Unexpected: no working install command found', {cause: error});

        const argv = command(error.packages);

        print(argv.map(v => GLib.shell_quote(v)).join(' '));

        const subprocess = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDIN_INHERIT);

        subprocess.wait_check(null);
    }

    const found = installer.require(versions);
    const {Repository} = GIRepository;
    const giRepo = 'get_default' in Repository
        ? /** @type {typeof GIRepository2.Repository} */ (Repository).get_default()
        : /** @type {typeof GIRepository3.Repository} */ (Repository).dup_default();

    for (const [namespace, version] of Object.entries(versions)) {
        /** @type {{ __version__: string }|undefined} */
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const imported = found[namespace];

        if (!imported)
            throw new Error(`${namespace} is missing from returned object`);

        if (imported.__version__ !== version) {
            throw new Error(
                `${namespace} requested version: ${version}, got ${imported.__version__}`
            );
        }

        const typelibPath = giRepo.get_typelib_path(namespace);
        const typelibFileName = GLib.path_get_basename(/** @type {string} */ (typelibPath));

        /** @type {{packages: Partial<Record<string, Partial<Record<string, TypelibResolver>>>>}} */
        const {packages} = installer;
        const expectedFileName = packages[namespace]?.[version]?.().filename;

        if (typelibFileName !== expectedFileName) {
            throw new Error(
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `${namespace} version ${version}: expected file name ${expectedFileName}, got ${typelibFileName}`
            );
        }
    }

    return 0;
}

GLib.set_prgname(System.programInvocationName);

const app = new Gio.Application();

app.add_main_option(
    'input',
    'i'.charCodeAt(0),
    GLib.OptionFlags.NONE,
    GLib.OptionArg.STRING,
    'Source code file (gjs-typelib-installer.js). Will read gjs-typelib-installer.js from the current directory if not specified.',
    'gjs-typelib-installer.js'
);

app.add_main_option(
    GLib.OPTION_REMAINING,
    0,
    GLib.OptionFlags.NONE,
    GLib.OptionArg.STRING_ARRAY,
    'Libraries/namespaces to include, in "Namespace-version" format, for example: Gtk-3.0',
    null
);

app.set_option_context_parameter_string('-- Namespace-version Namespace-version…');

app.connect('handle-local-options', (_, options) => {
    const srcPath = GLib.canonicalize_filename(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        options.lookup('input', 's') ?? 'gjs-typelib-installer.js',
        null
    );

    /** @type {string[]|null} */
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
    const typelibs = options.lookup(GLib.OPTION_REMAINING, 'as', true);

    if (!typelibs) {
        printerr('No namespaces/libraries specified');
        return GNU_SKIP_RETURNCODE;
    }

    app.hold();

    void main(srcPath, typelibs).catch(/** @param {unknown} error */ error => {
        logError(error);
        return 1;
    }).then(exitCode => {
        app.release();
        System.exit(exitCode);
    });

    return -1;
});

app.connect('activate', () => { /* promise started from handle-local-options */ });
void app.runAsync([System.programInvocationName, ...System.programArgs]);
