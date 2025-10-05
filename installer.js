// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

function getOsIds() {
    let osIds = [GLib.get_os_info('ID')];

    for (const like of GLib.get_os_info('ID_LIKE')?.split(' ') ?? []) {
        if (like)
            osIds.push(like);
    }

    if (osIds.includes('ubuntu') && !osIds.includes('debian'))
        osIds.push('debian');

    return osIds;
}

function shellJoin(argv) {
    return argv.map(arg => GLib.shell_quote(arg)).join(' ');
}

function promisify(start, finish) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line no-invalid-this
            start.call(this, ...args, (source, result) => {
                try {
                    resolve(finish.call(source, result));
                } catch (error) {
                    reject(error);
                }
            });
        });
    };
}

/**
 * Tests if PackageKit's pkcon command has a working backend.
 *
 * @async
 * @param {string} pkcon - path to the pkcon binary
 * @param {Gio.Cancellable} cancellable
 * @returns {Promise<void>}
 * @throws if the test fails
 */
async function testPkcon(pkcon, cancellable) {
    cancellable?.set_error_if_cancelled();

    const launcher = Gio.SubprocessLauncher.new(Gio.SubprocessFlags.STDOUT_PIPE);

    launcher.setenv('LC_ALL', 'C.UTF-8', true);

    const argv = [pkcon, 'backend-details'];
    const subprocess = launcher.spawnv(argv);

    try {
        const waitCheck = promisify(subprocess.wait_check_async, subprocess.wait_check_finish);
        const communicateUtf8 =
            promisify(subprocess.communicate_utf8_async, subprocess.communicate_utf8_finish);

        const [, stdout] = await communicateUtf8.call(subprocess, null, cancellable);

        await waitCheck.call(subprocess, cancellable);

        // Even if `pkcon` exits with code 0, it doesn't mean it actually works...
        if (!stdout.startsWith('Name:')) {
            throw new Error(
                `Unexpected output from ${shellJoin(argv)}: ${JSON.stringify(stdout)}`
            );
        }
    } finally {
        if (subprocess.get_identifier())
            subprocess.force_exit();
    }
}

/**
 * Finds the command to install OS packages. Prefers PackageKit pkcon if it is
 * available.
 *
 * @async
 * @param {Gio.Cancellable} cancellable
 * @returns {Promise<(packages: string[]) => string[]>} - the function that,
 * given the list of packages, generates the installation command
 */
export async function findInstallCommand(cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const pkcon = GLib.find_program_in_path('pkcon');

    if (pkcon) {
        try {
            await testPkcon(pkcon, cancellable);
            return packages => [pkcon, 'install', '-c', '1000', ...packages];
        } catch (ex) {
            logError(ex, `${pkcon} doesn't seem to work`);
        }
    }

    const pkexec = GLib.find_program_in_path('pkexec');

    if (!pkexec)
        return null;

    for (const os of getOsIds()) {
        if (os === 'alpine') {
            const apk = GLib.find_program_in_path('apk');

            if (apk)
                return packages => [pkexec, apk, '-U', 'add', ...packages];
        } else if (os === 'arch') {
            const pacman = GLib.find_program_in_path('pacman');

            if (pacman)
                return packages => [pkexec, pacman, '-Sy', ...packages];
        } else if (os === 'debian') {
            const apt = GLib.find_program_in_path('apt') ?? GLib.find_program_in_path('apt-get');

            if (apt) {
                return packages => ['sh', '-c', [
                    shellJoin([pkexec, apt, 'update']),
                    shellJoin(['exec', pkexec, apt, 'install', ...packages]),
                ].join(' && ')];
            }
        } else if (os === 'fedora') {
            const yum = GLib.find_program_in_path('dnf') ?? GLib.find_program_in_path('yum');

            if (yum)
                return packages => [pkexec, yum, 'install', ...packages];
        } else if (os === 'suse') {
            const zypper = GLib.find_program_in_path('zypper');

            if (zypper)
                return packages => [pkexec, zypper, 'install', ...packages];
        }
    }

    return null;
}

/**
 * Finds a terminal emulator to run commands in.
 *
 * @async
 * @param {Gio.Cancellable} cancellable
 * @returns {Promise<(argv: string[]) => string[]>} - the function that,
 * given the list of arguments, generates full command line
 */
// eslint-disable-next-line require-await -- keep all public functions async
export async function findTerminalCommand(cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const kgx = GLib.find_program_in_path('kgx');

    if (kgx)
        return argv => [kgx, `--command=${shellJoin(argv)}`];

    const gnomeTerminal = GLib.find_program_in_path('gnome-terminal');

    if (gnomeTerminal)
        return argv => [gnomeTerminal, '--', ...argv];

    const xdgTerminalExec = GLib.find_program_in_path('xdg-terminal-exec');

    if (xdgTerminalExec)
        return argv => [xdgTerminalExec, ...argv];

    return null;
}

/**
 * Finds the command to install OS packages. Prefers PackageKit pkcon if it is
 * available. Wraps the command to launch it in a terminal emulator.
 *
 * @async
 * @param {Gio.Cancellable} cancellable
 * @returns {Promise<(packages: string[]) => string[]>} - the function that,
 * given the list of packages, generates the installation command
 */
export async function findTerminalInstallCommand(cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const terminalCommand = await findTerminalCommand(cancellable);

    if (!terminalCommand)
        return null;

    const installCommand = await findInstallCommand(cancellable);

    if (!installCommand)
        return null;

    return packages => terminalCommand(installCommand(packages));
}
