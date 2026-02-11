#!/usr/bin/env gjs

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

const {GLib, Gio} = imports.gi;
const System = imports.system;

async function main(options) {
    const srcPath =
        GLib.canonicalize_filename(options.lookup('input', 's') ?? 'installer.js', null);

    const outputPath = options.lookup('output', 's');
    const typelibs = options.lookup(GLib.OPTION_REMAINING, 'as', true);

    if (!typelibs) {
        printerr('No namespaces/libraries specified');
        return 1;
    }

    const {packages} = await import(GLib.filename_to_uri(srcPath, null));
    const includeNamespaces = {};

    for (const spec of typelibs) {
        const [namespace, version, ...extra] = spec.split('-');

        if (!version || extra.length) {
            printerr(`Invalid argument ${spec}: should be in "Namespace-version" format, for example: Gtk-3.0`);
            return 1;
        }

        const func = packages[namespace]?.[version];

        if (!func) {
            printerr(`No definition found for namespace ${namespace}, version ${version}`);
            return 1;
        }

        const versions = includeNamespaces[namespace] ?? {};

        versions[version] = func;
        includeNamespaces[namespace] = versions;
    }

    const [, srcBytes] = GLib.file_get_contents(srcPath);
    const srcText = new TextDecoder().decode(srcBytes);
    const indent = '    ';
    const replaceText = Object.entries(includeNamespaces).map(([namespace, versions]) => {
        const versionsText = Object.entries(versions).map(
            ([version, func]) => `${indent}${indent}'${version}': ${func.toString()},`
        ).join('\n');

        return `${indent}${namespace}: {\n${versionsText}\n${indent}},`;
    }).join('\n');

    const replacedText = srcText.replace(
        /export const packages = {\n.*?\n};/s,
        `export const packages = {\n${replaceText}\n};`
    );

    if (!outputPath)
        print(replacedText);
    else
        GLib.file_set_contents(outputPath, replacedText);

    return 0;
}

GLib.set_prgname(System.programInvocationName);

const app = new Gio.Application();

app.add_main_option(
    'input',
    'i'.charCodeAt(0),
    GLib.OptionFlags.NONE,
    GLib.OptionArg.STRING,
    'Source code file (installer.js). Will read installer.js from the current directory if not specified.',
    'installer.js'
);

app.add_main_option(
    'output',
    'o'.charCodeAt(0),
    GLib.OptionFlags.NONE,
    GLib.OptionArg.STRING,
    'Output file. Will output to stdout if not specified.',
    'output.js'
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
