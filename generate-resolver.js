#!/usr/bin/env gjs

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

const {GLib} = imports.gi;
const {programInvocationName, programArgs, exit} = imports.system;

async function main() {
    if (programArgs.length < 2) {
        printerr(
            `Usage: ${programInvocationName} installer.js output-file.js namespace=version namespace=version ...`
        );

        return 1;
    }

    const srcPath = GLib.canonicalize_filename(programArgs[0], null);
    const {packages} = await import(GLib.filename_to_uri(srcPath, null));
    const includeNamespaces = {};

    for (const spec of programArgs.slice(2)) {
        const [namespace, version, ...extra] = spec.split('=');

        if (!version || extra.length) {
            printerr(`Invalid argument ${spec}: should be in namespace=version format`);
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

    const outputPath = programArgs[1];

    if (outputPath === '-')
        print(replacedText);
    else
        GLib.file_set_contents(outputPath, replacedText);

    return 0;
}

main().then(exitCode => exit(exitCode)).catch(error => {
    logError(error);
    exit(1);
});
