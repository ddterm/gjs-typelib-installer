#!/usr/bin/env gjs

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

const {GLib, Gio, GIRepository} = imports.gi;
const System = imports.system;

const GNU_SKIP_RETURNCODE = 77;
const GNU_ERROR_RETURNCODE = 99;

async function main(options) {
    const srcPath = GLib.canonicalize_filename(
        options.lookup('input', 's') ?? 'gjs-typelib-installer.js',
        null
    );

    const installer = await import(GLib.filename_to_uri(srcPath, null));
    const typelibs = options.lookup(GLib.OPTION_REMAINING, 'as', true);
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
        const argv = command(error.packages);

        print(argv.map(v => GLib.shell_quote(v)).join(' '));

        const subprocess = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDIN_INHERIT);

        subprocess.wait_check(null);
    }

    const found = installer.require(versions);
    const giRepo = GIRepository.Repository.dup_default?.() ?? GIRepository.Repository.get_default?.();

    for (const [namespace, version] of Object.entries(versions)) {
        const imported = found[namespace];

        if (!imported)
            throw new Error(`${namespace} is missing from returned object`);

        if (imported.__version__ !== version) {
            throw new Error(
                `${namespace} requested version: ${version}, got ${imported.__version__}`
            );
        }

        const typelibPath = giRepo.get_typelib_path(namespace);
        const typelibFileName = GLib.path_get_basename(typelibPath);
        const expectedFileName = installer.packages[namespace][version]().filename;

        if (typelibFileName !== expectedFileName) {
            throw new Error(
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

    main(options).catch(error => {
        logError(error);
        return 1;
    }).then(exitCode => {
        app.release();
        System.exit(exitCode);
    });

    return -1;
});

app.connect('activate', () => {});
app.run([System.programInvocationName, ...System.programArgs]);
