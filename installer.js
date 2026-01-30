// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gi from 'gi';

function getVersionPrefix(version) {
    const index = version.lastIndexOf('.');

    return index === -1 ? '' : version.slice(0, index);
}

function getOsIds() {
    let osIds = [];
    let osId = GLib.get_os_info('ID');
    let osVersionId = GLib.get_os_info('VERSION_ID');

    for (let prefix = osVersionId; prefix; prefix = getVersionPrefix(prefix))
        osIds.push(`${osId}:${prefix}`);

    osIds.push(osId);

    for (const like of GLib.get_os_info('ID_LIKE')?.split(' ') ?? []) {
        if (like)
            osIds.push(like);
    }

    if (osIds.includes('ubuntu') && !osIds.includes('debian'))
        osIds.push('debian');

    return osIds;
}

let cachedOsIds;

function resolveByOsId(filename, distros) {
    if (!cachedOsIds)
        cachedOsIds = getOsIds();

    for (const osId of cachedOsIds) {
        const packages = distros[osId];

        if (packages !== undefined)
            return {packages, filename};
    }

    return {filename};
}

export const packages = {
    Adw: {
        '1': () => resolveByOsId('Adw-1.typelib', {
            alpine: ['libadwaita'],
            arch: ['libadwaita'],
            debian: ['gir1.2-adw-1'],
            fedora: ['libadwaita'],
            suse: ['typelib-1_0-Adw-1'],
        }),
    },
    Gdk: {
        '3.0': () => resolveByOsId('Gdk-3.0.typelib', {
            alpine: ['gtk+3.0'],
            arch: ['gtk3'],
            debian: ['gir1.2-gtk-3.0'],
            fedora: ['gtk3'],
            suse: ['typelib-1_0-Gtk-3_0'],
        }),
        '4.0': () => resolveByOsId('Gdk-4.0.typelib', {
            alpine: ['gtk4.0'],
            arch: ['gtk4'],
            debian: ['gir1.2-gtk-4.0'],
            fedora: ['gtk4'],
            suse: ['typelib-1_0-Gtk-4_0'],
        }),
    },
    Gtk: {
        '3.0': () => resolveByOsId('Gtk-3.0.typelib', {
            alpine: ['gtk+3.0'],
            arch: ['gtk3'],
            debian: ['gir1.2-gtk-3.0'],
            fedora: ['gtk3'],
            suse: ['typelib-1_0-Gtk-3_0'],
        }),
        '4.0': () => resolveByOsId('Gtk-4.0.typelib', {
            alpine: ['gtk4.0'],
            arch: ['gtk4'],
            debian: ['gir1.2-gtk-4.0'],
            fedora: ['gtk4'],
            suse: ['typelib-1_0-Gtk-4_0'],
        }),
    },
    Handy: {
        '1': () => resolveByOsId('Handy-1.typelib', {
            alpine: ['libhandy1'],
            arch: ['libhandy'],
            debian: ['gir1.2-handy-1'],
            fedora: ['libhandy'],
            suse: ['typelib-1_0-Handy-1_0'],
        }),
    },
    cairo: {
        '1.0': () => resolveByOsId('cairo-1.0.typelib', {
            alpine: ['gobject-introspection'],
            arch: ['gobject-introspection-runtime'],
            debian: ['gir1.2-freedesktop'],
            fedora: ['gobject-introspection'],
            suse: ['girepository-1_0'],
        }),
    },
    Pango: {
        '1.0': () => resolveByOsId('Pango-1.0.typelib', {
            alpine: ['pango'],
            arch: ['pango'],
            debian: ['gir1.2-pango-1.0'],
            fedora: ['pango'],
            suse: ['typelib-1_0-Pango-1_0'],
        }),
    },
    Vte: {
        '2.91': () => resolveByOsId('Vte-2.91.typelib', {
            alpine: ['vte3'],
            arch: ['vte3'],
            debian: ['gir1.2-vte-2.91'],
            fedora: ['vte291'],
            suse: ['typelib-1_0-Vte-2_91'],
        }),
        '3.91': () => resolveByOsId('Vte-3.91.typelib', {
            alpine: ['vte3-gtk4'],
            // https://gitlab.alpinelinux.org/alpine/aports/-/issues/17029
            'alpine:3.20': ['vte3', 'vte3-gtk4'],
            'alpine:3.21': ['vte3', 'vte3-gtk4'],
            arch: ['vte4'],
            debian: ['gir1.2-vte-3.91'],
            fedora: ['vte291-gtk4'],
            suse: ['typelib-1_0-Vte-3_91'],
        }),
    },
    GioUnix: {
        '2.0': () => resolveByOsId('GioUnix-2.0.typelib', {
            alpine: ['glib'],
            arch: ['glib2'],
            debian: ['gir1.2-glib-2.0'],
            fedora: ['glib2'],
            'opensuse-leap:15': null,
            suse: ['typelib-1_0-Gio-2_0'],
        }),
    },
    GLibUnix: {
        '2.0': () => resolveByOsId('GLibUnix-2.0.typelib', {
            alpine: ['glib'],
            arch: ['glib2'],
            debian: ['gir1.2-glib-2.0'],
            fedora: ['glib2'],
            'opensuse-leap:15': null,
            suse: ['typelib-1_0-GLibUnix-2_0'],
        }),
    },
};

export class MissingDependencies extends Error {
    static #message(pkgs, files) {
        const parts = [];

        pkgs = Array.from(pkgs);
        files = Array.from(files);

        if (pkgs.length > 0)
            parts.push(`Missing packages: ${pkgs.join(', ')}.`);

        if (files.length > 0)
            parts.push(`Missing files: ${files.join(', ')}.`);

        return parts.join(' ');
    }

    constructor(pkgs, files) {
        super(MissingDependencies.#message(pkgs, files));

        this.name = 'MissingDependencies';
        this.packages = new Set(pkgs);
        this.files = new Set(files);
    }
};

/**
 * Import and return multiple GObject libraries.
 *
 * @param {object} versions - object mapping from GI namespace to version string
 * @returns {object} object mapping from GI namespace to the imported module
 * @throws {MissingDependencies|Error}
 */
export function require(versions) {
    const found = {};
    const missingPackages = new Set();
    const missingFiles = new Set();

    for (const [namespace, version] of Object.entries(versions)) {
        const resolver = packages[namespace]?.[version];

        if (!resolver)
            throw new Error(`No definition for namespace ${namespace}, version ${version}`);

        try {
            found[namespace] = Gi.require(namespace, version);
        } catch (error) {
            if (!error?.message?.includes(`Requiring ${namespace}, version ${version}:`))
                throw error;

            const {packages: pkgs, filename} = resolver();

            if (pkgs)
                missingPackages.add(...pkgs);
            else
                missingFiles.add(filename);
        }
    }

    if (missingPackages.size > 0 || missingFiles.size > 0)
        throw new MissingDependencies(missingPackages, missingFiles);

    return found;
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
 * Spawn a subprocess, wait for it to terminate, and get its stdout as string.
 *
 * @async
 * @param {string[]} argv - command line
 * @param {Gio.Cancellable} cancellable
 * @returns {Promise<string>}
 */
async function getSubprocessOutput(argv, cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const launcher = Gio.SubprocessLauncher.new(Gio.SubprocessFlags.STDOUT_PIPE);

    launcher.setenv('LC_ALL', 'C.UTF-8', true);

    const subprocess = launcher.spawnv(argv);

    try {
        const waitCheck = promisify(subprocess.wait_check_async, subprocess.wait_check_finish);
        const communicateUtf8 =
            promisify(subprocess.communicate_utf8_async, subprocess.communicate_utf8_finish);

        const [, stdout] = await communicateUtf8.call(subprocess, null, cancellable);

        await waitCheck.call(subprocess, cancellable);

        return stdout;
    } finally {
        if (subprocess.get_identifier())
            subprocess.force_exit();
    }
}

/**
 * Finds the command to install OS packages using PackageKit.
 *
 * @async
 * @param {Gio.Cancellable} cancellable
 * @returns {Promise<(pkgs: string[]) => string[]>} - the function that,
 * given the list of packages, generates the installation command
 */
async function findPackageKitInstallCommand(cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const pkgcli = GLib.find_program_in_path('pkgcli');

    if (pkgcli) {
        const argv = [pkgcli, '--json', 'backend'];

        try {
            const stdout = await getSubprocessOutput(argv, cancellable);
            let roles = JSON.parse(stdout).roles;

            if (!Array.isArray(roles))
                roles = `${roles}`.split(';');

            if (roles.includes('install-packages')) {
                if (roles.includes('refresh-cache')) {
                    return pkgs => ['sh', '-c', [
                        shellJoin([pkgcli, 'refresh']),
                        shellJoin(['exec', pkgcli, 'install', ...pkgs]),
                    ].join(' && ')];
                } else {
                    return pkgs => [pkgcli, 'install', ...pkgs];
                }
            } else {
                console.warn(
                    "%s output doesn't include 'install-packages':",
                    shellJoin(argv),
                    stdout
                );
            }
        } catch (ex) {
            if (ex instanceof GLib.Error &&
                ex.matches(Gio.io_error_quark(), Gio.IOErrorEnum.CANCELLED))
                throw ex;

            console.warn("%s doesn't seem to work:", shellJoin(argv), ex);
        }
    }

    const pkcon = GLib.find_program_in_path('pkcon');

    if (pkcon) {
        const argv = [pkcon, '--plain', 'get-roles'];

        try {
            const stdout = await getSubprocessOutput(argv, cancellable);
            const roles = stdout.split('\n');

            if (roles.includes('install-packages')) {
                if (roles.includes('refresh-cache')) {
                    return pkgs => ['sh', '-c', [
                        shellJoin([pkcon, 'refresh']),
                        shellJoin(['exec', pkcon, 'install', ...pkgs]),
                    ].join(' && ')];
                } else {
                    return pkgs => [pkcon, 'install', ...pkgs];
                }
            } else {
                console.warn(
                    "%s output doesn't include 'install-packages':",
                    shellJoin(argv),
                    stdout
                );
            }
        } catch (ex) {
            if (ex instanceof GLib.Error &&
                ex.matches(Gio.io_error_quark(), Gio.IOErrorEnum.CANCELLED))
                throw ex;

            console.warn("%s doesn't seem to work:", shellJoin(argv), ex);
        }
    }

    return null;
}

/**
 * Finds the command to install OS packages. Prefers PackageKit pkgcli/pkcon
 * when available.
 *
 * @async
 * @param {Gio.Cancellable} cancellable
 * @returns {Promise<(pkgs: string[]) => string[]>} - the function that,
 * given the list of packages, generates the installation command
 */
export async function findInstallCommand(cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const packageKit = await findPackageKitInstallCommand(cancellable);

    if (packageKit)
        return packageKit;

    const pkexec = GLib.find_program_in_path('pkexec');

    if (!pkexec)
        return null;

    for (const os of getOsIds()) {
        if (os === 'alpine') {
            const apk = GLib.find_program_in_path('apk');

            if (apk)
                return pkgs => [pkexec, apk, '-U', 'add', ...pkgs];
        } else if (os === 'arch') {
            const pacman = GLib.find_program_in_path('pacman');

            if (pacman)
                return pkgs => [pkexec, pacman, '-Sy', ...pkgs];
        } else if (os === 'debian') {
            const apt = GLib.find_program_in_path('apt') ?? GLib.find_program_in_path('apt-get');

            if (apt) {
                return pkgs => ['sh', '-c', [
                    shellJoin([pkexec, apt, 'update']),
                    shellJoin(['exec', pkexec, apt, 'install', ...pkgs]),
                ].join(' && ')];
            }
        } else if (os === 'fedora') {
            const yum = GLib.find_program_in_path('dnf') ?? GLib.find_program_in_path('yum');

            if (yum)
                return pkgs => [pkexec, yum, 'install', ...pkgs];
        } else if (os === 'suse') {
            const zypper = GLib.find_program_in_path('zypper');

            if (zypper)
                return pkgs => [pkexec, zypper, 'install', ...pkgs];
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
 * Finds the command to install OS packages. Prefers PackageKit CLI when
 * available. Wraps the command to launch it in a terminal emulator.
 *
 * @async
 * @param {Gio.Cancellable} cancellable
 * @returns {Promise<(pkgs: string[]) => string[]>} - the function that,
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

    return pkgs => terminalCommand(installCommand(pkgs));
}
