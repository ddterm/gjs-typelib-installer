#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
// @ts-expect-error no types available
import GIRepository from 'gi://GIRepository';

import System from 'system';

const GNU_SKIP_RETURNCODE = 77;
const GNU_ERROR_RETURNCODE = 99;

/**
 * @param {GLib.VariantDict} options
 */
async function main(options) {
    const srcPath = GLib.canonicalize_filename(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        options.lookup('input', 's') ?? 'gjs-typelib-installer.js',
        null
    );

    /** @type {import('../gjs-typelib-installer.js')} */
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
    const installer = await import(GLib.filename_to_uri(srcPath, null));

    /** @type {string[]|null} */
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
    const typelibs = options.lookup(GLib.OPTION_REMAINING, 'as', true);

    /** @type {Record<string, string>} */
    const versions = {};

    if (!typelibs) {
        printerr('No namespaces/libraries specified');
        return GNU_SKIP_RETURNCODE;
    }

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
            throw new Error(`Unresolved files: ${error.message}`);

        const command = await installer.findInstallCommand();

        if (!command)
            throw new Error('Unexpected: no working install command found');

        const argv = command(error.packages);

        print(argv.map(v => GLib.shell_quote(v)).join(' '));

        const subprocess = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDIN_INHERIT);

        subprocess.wait_check(null);
    }

    const found = installer.require(versions);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const giRepo = GIRepository.Repository.dup_default?.() ?? GIRepository.Repository.get_default?.();

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

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        /** @type {string} */ const typelibPath = giRepo.get_typelib_path(namespace);
        const typelibFileName = GLib.path_get_basename(typelibPath);
        const expectedFileName = installer.packages[namespace]?.[version]?.().filename;

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
    app.hold();

    void main(options).catch(/** @param {unknown} error */ error => {
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
