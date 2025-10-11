#!/usr/bin/env gjs

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

const {GLib, Gio, GIRepository} = imports.gi;
const System = imports.system;

async function main() {
    const resolver = await import('../resolver.js');
    const installer = await import('../installer.js');
    const versions = {};

    for (const arg of System.programArgs) {
        const [namespace, version, ...extra] = arg.split('=');

        if (!version || extra.length)
            throw new Error(`Invalid argument ${arg}: should be in namespace=version format`);

        versions[namespace] = version;
    }

    try {
        resolver.require(versions);

        throw new Error(`Unexpected: import succeeded: ${JSON.stringify(versions)}`);
    } catch (error) {
        if (!(error instanceof resolver.MissingDependencies))
            throw error;

        if (error.files.size > 0)
            throw new Error(`Unresolved files: ${error.message}`);

        const command = await installer.findInstallCommand();
        const argv = command(error.packages);

        print(argv.map(v => GLib.shell_quote(v)).join(' '));

        const subprocess = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDIN_PIPE);
        const stdin = subprocess.get_stdin_pipe();

        try {
            for (;;)
                stdin.write_all('y\n', null);
        } catch {
        }

        subprocess.wait_check(null);
    }

    const found = resolver.require(versions);
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
        const expectedFileName = resolver.packages[namespace][version]().filename;

        if (typelibFileName !== expectedFileName) {
            throw new Error(
                `${namespace} version ${version}: expected file name ${expectedFileName}, got ${typelibFileName}`
            );
        }
    }
}

const loop = GLib.MainLoop.new(null, false);

loop.runAsync();

main().then(() => loop.quit(), error => {
    loop.quit();
    logError(error);
    System.exit(1);
});
