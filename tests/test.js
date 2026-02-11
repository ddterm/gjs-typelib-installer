#!/usr/bin/env gjs

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

const {GLib, Gio} = imports.gi;
const System = imports.system;

function listFilesCommand() {
    let osIds = [GLib.get_os_info('ID')];

    for (const like of GLib.get_os_info('ID_LIKE')?.split(' ') ?? []) {
        if (like)
            osIds.push(like);
    }

    if (osIds.includes('ubuntu') && !osIds.includes('debian'))
        osIds.push('debian');

    for (const os of osIds) {
        if (os === 'alpine')
            return packageName => ['apk', 'info', '-Lq', packageName];

        if (os === 'arch')
            return packageName => ['pacman', '-Qql', packageName];

        if (os === 'debian')
            return packageName => ['dpkg-query', '-L', packageName];

        if (os === 'fedora' || os === 'suse')
            return packageName => ['rpm', '-ql', '--whatprovides', packageName];
    }

    return null;
}

function listFiles(packageName) {
    const command = listFilesCommand();
    const spawnFlags = GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.CHILD_INHERITS_STDERR;
    const resolvedCommand = command(packageName);

    print('#', tapEscape(resolvedCommand.map(arg => GLib.shell_quote(arg)).join(' ')));

    const [, stdout, , waitStatus] = GLib.spawn_sync(null, resolvedCommand, null, spawnFlags, null);

    try {
        GLib.spawn_check_wait_status(waitStatus);
    } catch (error) {
        print('#', new TextDecoder().decode(stdout).replace('\n', '#'));
        throw error;
    }

    return new TextDecoder().decode(stdout).split(/\n/).filter(v => v !== '');
}

function tapEscape(str) {
    return str.replace(/\\|#/g, '\\$&');
}

function test(n, name, resolveFunc) {
    print('#', n, '-', name);

    const {packages, filename} = resolveFunc();

    if (!packages) {
        const description = tapEscape(`skipping ${JSON.stringify(filename)} - no known package`);

        print('ok', n, '-', name, '#', 'SKIP', description);
        return;
    }

    for (const packageName of packages) {
        const files = listFiles(packageName);
        const fileNames = files.map(p => GLib.path_get_basename(p));

        if (fileNames.includes(filename)) {
            const description = tapEscape(
                `package ${JSON.stringify(packageName)} provides file ${JSON.stringify(filename)}`
            );

            print('ok', n, '-', name, ':', description);
            return;
        }
    }

    throw new Error(
        `File ${JSON.stringify(filename)} is not provided by packages ${JSON.stringify(packages)}`
    );
}

async function main(options) {
    const srcPath =
        GLib.canonicalize_filename(options.lookup('input', 's') ?? 'installer.js', null);

    const installer = await import(GLib.filename_to_uri(srcPath, null));
    let n = 0;
    let fail = false;

    for (const [namespace, versions] of Object.entries(installer.packages)) {
        for (const [version, resolveFunc] of Object.entries(versions)) {
            n += 1;

            const name = tapEscape(`${namespace}-${version}`);

            try {
                test(n, name, resolveFunc);
            } catch (error) {
                fail = true;
                print('not ok', n, '-', name, ':', tapEscape(String(error)));
            }
        }
    }

    print(`1..${n}`);

    return fail ? 1 : 0;
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

app.connect('handle-local-options', (_, options) => {
    app.hold();

    main(options).catch(error => {
        print('Bail out!', tapEscape(String(error)));
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
