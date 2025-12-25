#!/usr/bin/env gjs

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

const {GLib} = imports.gi;
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

    const [, stdout, , waitStatus] =
        GLib.spawn_sync(null, command(packageName), null, spawnFlags, null);

    try {
        GLib.spawn_check_wait_status(waitStatus);
    } catch (error) {
        print(TextDecoder().decode(stdout));
        throw error;
    }

    return new TextDecoder().decode(stdout).split(/\n/).filter(v => v !== '');
}

async function main() {
    const installer = await import('../installer.js');

    for (const [namespace, versions] of Object.entries(installer.packages)) {
        for (const [version, resolveFunc] of Object.entries(versions)) {
            const {packages, filename} = resolveFunc();

            if (!packages) {
                printerr(`Skipping ${JSON.stringify(filename)} - no known package`);
                continue;
            }

            printerr(
                `Verify that ${JSON.stringify(packages)} contains file ${JSON.stringify(filename)}`
            );

            if (!packages.flatMap(listFiles).map(p => GLib.path_get_basename(p)).includes(filename)) {
                throw new Error(
                    `${namespace} ${version}: file ${JSON.stringify(filename)} is not provided by packages ${JSON.stringify(packages)}`
                );
            }
        }
    }
}

main().then(exitCode => System.exit(exitCode)).catch(error => {
    logError(error);
    System.exit(1);
});
