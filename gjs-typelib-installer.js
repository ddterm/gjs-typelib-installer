// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gi from 'gi';

/**
 * Extract the version prefix by removing the last component.
 *
 * @private
 * @param {string} version - Version string.
 * @returns {string} Version prefix without the last component, or empty string.
 */
function getVersionPrefix(version) {
    const index = version.lastIndexOf('.');

    return index === -1 ? '' : version.slice(0, index);
}

/**
 * Get list of OS identifiers (from /etc/os-release) for package resolution.
 * Generates version-specific IDs (e.g., "debian:12", "debian:11")
 * and includes ID_LIKE entries for derivative distributions.
 *
 * @private
 * @returns {string[]} List of OS identifiers.
 */
function getOsIds() {
    let osIds = [];
    let osId = GLib.get_os_info('ID');
    let osVersionId = GLib.get_os_info('VERSION_ID');

    if (!osId)
        throw new Error('Can not query OS info');

    for (let prefix = osVersionId; prefix; prefix = getVersionPrefix(prefix))
        osIds.push(`${osId}:${prefix}`);

    osIds.push(osId);

    const osLike = GLib.get_os_info('ID_LIKE');

    if (osLike) {
        for (const like of osLike.split(' ')) {
            if (like)
                osIds.push(like);
        }
    }

    if (osIds.includes('ubuntu') && !osIds.includes('debian'))
        osIds.push('debian');

    return osIds;
}

/**
 * Cached list of OS identifiers for package resolution.
 *
 * @private
 * @type {string[]|undefined}
 */
let cachedOsIds;

/**
 * Get cached list of OS identifiers for package resolution.
 *
 * @private
 * @returns {string[]} Cached list of OS identifiers.
 */
function getOsIdsCached() {
    cachedOsIds ??= getOsIds();

    return cachedOsIds;
}

/**
 * Information about typelib dependency - object with typelib file name
 * and an optional list of OS packages to install.
 *
 * @typedef TypelibInfo
 * @property {string} filename - File name of the library.
 * @property {string[]|null} [packages] - List of OS packages that need to be
 * installed to use this library.
 */

/**
 * Function that resolves typelib package name(s) for the current distro.
 *
 * @callback TypelibResolver
 * @returns {TypelibInfo} Typelib file name and optional package list.
 */

/**
 * Resolve a typelib file name to package information based on OS ID.
 * Iterates through cached OS IDs and returns the first matching distro entry.
 *
 * @private
 * @param {string} filename - The typelib filename to resolve.
 * @param {Partial<Record<string,string[]|null>>} distros - Mapping of OS IDs to package lists.
 * @returns {TypelibInfo} Typelib information with filename and optional packages.
 */
function resolveByOsId(filename, distros) {
    for (const osId of getOsIdsCached()) {
        const packages = distros[osId];

        if (packages !== undefined)
            return {packages, filename};
    }

    return {filename};
}

/**
 * Package definitions for GObject introspection typelibs.
 * Organized by namespace and version, each entry maps to a resolver function
 * that returns the appropriate package names for the current OS.
 *
 * @type {Partial<Record<string, Partial<Record<string, TypelibResolver>>>>}
 */
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
    Template: {
        '1.0': () => resolveByOsId('Template-1.0.typelib', {
            alpine: ['template-glib'],
            arch: ['template-glib'],
            debian: ['gir1.2-template-1.0'],
            fedora: ['template-glib'],
            rhel: null,
            suse: ['typelib-1_0-Template-1_0'],
        }),
    },
};

/**
 * Error thrown when GObject typelibs are missing.
 * This error is thrown by {@link require} when one or more typelibs cannot be
 * loaded and their corresponding packages or files are identified as missing.
 */
export class MissingDependencies extends Error {
    /**
     * The set of missing package names.
     *
     * @type {Set<string>}
     */
    packages;

    /**
     * The set of missing typelib filenames.
     *
     * @type {Set<string>}
     */
    files;

    /**
     * Create a MissingDependencies error.
     *
     * @param {Set<string>} pkgs - Missing package names.
     * @param {Set<string>} files - Missing typelib filenames.
     */
    constructor(pkgs, files) {
        const msgParts = [];

        if (pkgs.size > 0)
            msgParts.push(`Missing packages: ${Array.from(pkgs).join(', ')}.`);

        if (files.size > 0)
            msgParts.push(`Missing files: ${Array.from(files).join(', ')}.`);

        super(msgParts.join(' '));

        this.name = 'MissingDependencies';
        this.packages = pkgs;
        this.files = files;
    }
};

/* eslint-disable jsdoc/reject-any-type */
/**
 * Import multiple GObject libraries and return the imported modules.
 *
 * @param {Partial<Record<string, string>>} versions - An object with
 * namespaces as keys and verions as values.
 * @returns {Partial<Record<string, any>>} Imported modules.
 * @throws {MissingDependencies} If a known library is not installed.
 * @throws {Error} If unknown library is requested.
 */
export function require(versions) {
    /** @type {Partial<Record<string, any>>} */
    const found = {};
    /** @type {Set<string>} */
    const missingPackages = new Set();
    /** @type {Set<string>} */
    const missingFiles = new Set();

    for (const [namespace, version] of Object.entries(versions)) {
        if (typeof version !== 'string')
            throw new Error(`Version for namespace ${namespace} is not a string`);

        const resolver = packages[namespace]?.[version];

        if (!resolver) {
            throw new Error([
                `No definition for namespace ${namespace}, version ${version} found.`,
                'If you use gjs-typelib-installer as Meson subproject,',
                'try removing the build directory and restarting the build from scratch',
            ].join(' '));
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            found[namespace] = Gi.require(namespace, version);
        } catch (error) {
            if (!(error instanceof Error))
                throw error;

            if (!error.message.includes(`Requiring ${namespace}, version ${version}:`))
                throw error;

            const {packages: pkgs, filename} = resolver();

            if (pkgs) {
                for (const pkg of pkgs)
                    missingPackages.add(pkg);
            } else {
                missingFiles.add(filename);
            }
        }
    }

    if (missingPackages.size > 0 || missingFiles.size > 0)
        throw new MissingDependencies(missingPackages, missingFiles);

    return found;
}
/* eslint-enable jsdoc/reject-any-type */

/**
 * Quote and join command line arguments for shell execution.
 *
 * @private
 * @param {Iterable<string>|Array<string>} argv - Command line arguments.
 * @returns {string} Shell-quoted and joined command string.
 */
function shellJoin(argv) {
    if (!Array.isArray(argv))
        return shellJoin(Array.from(argv));

    return argv.map(arg => GLib.shell_quote(arg)).join(' ');
}

/**
 * @private
 * @param {Gio.Subprocess} subprocess - Subprocess to wait for.
 * @param {Gio.Cancellable | null} cancellable - Cancellable object or null.
 * @returns {Promise<void>}
 */
function waitCheck(subprocess, cancellable) {
    return new Promise((resolve, reject) => {
        subprocess.wait_check_async(cancellable, (source, result) => {
            try {
                Gio.Subprocess.prototype.wait_check_finish.call(source, result);
                resolve();
            } catch (error) {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(error);
            }
        });
    });
}

/**
 * @private
 * @param {Gio.Subprocess} subprocess - Subprocess to communicate with.
 * @param {string | null} stdinBuf - Data to send to stdin or null.
 * @param {Gio.Cancellable | null} cancellable - Optional cancellable for aborting the operation.
 * @returns {Promise<string[]>} - Stdout and stderr as array: [stdout, stderr].
 */
function communicateUtf8(subprocess, stdinBuf, cancellable) {
    return new Promise((resolve, reject) => {
        subprocess.communicate_utf8_async(stdinBuf, cancellable, (source, result) => {
            try {
                const [, stdout, stderr] =
                    Gio.Subprocess.prototype.communicate_utf8_finish.call(source, result);

                resolve([stdout, stderr]);
            } catch (error) {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(error);
            }
        });
    });
}

/**
 * Spawn a subprocess, wait for it to terminate, and get its stdout as string.
 *
 * @private
 * @param {string[]} argv - Command line.
 * @param {Gio.Cancellable|null} cancellable - Optional cancellable for aborting the operation.
 * @returns {Promise<string>} Subprocess stdout as string.
 */
async function getSubprocessOutput(argv, cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const launcher = Gio.SubprocessLauncher.new(Gio.SubprocessFlags.STDOUT_PIPE);

    launcher.setenv('LC_ALL', 'C.UTF-8', true);

    const subprocess = launcher.spawnv(argv);

    try {
        const [stdout] = await communicateUtf8(subprocess, null, cancellable);

        await waitCheck(subprocess, cancellable);

        return stdout;
    } finally {
        if (subprocess.get_identifier())
            subprocess.force_exit();
    }
}

/**
 * Parse the JSON output from 'pkgcli --json backend' command.
 * Extracts and validates the roles array from the JSON response.
 *
 * @private
 * @param {string} stdout - Output of 'pkgcli --json backend'.
 * @returns {unknown[]} Roles as array.
 */
function parsePkgCliRoles(stdout) {
    const json = /** @type {unknown} */ (JSON.parse(stdout));

    if (!json || typeof json !== 'object')
        throw new Error(`Expected output to contain a JSON object: ${stdout}`);

    if (!('roles' in json))
        throw new Error(`Expected output to contain 'roles' key: ${stdout}`);

    const {roles} = json;

    if (typeof roles === 'string')
        return roles.split(';');

    if (Array.isArray(roles))
        return roles;

    throw new Error(`Expected 'roles' to be a string or an array: ${stdout}`);
}

/**
 * A function that, given a list of packages, generates the installation command.
 *
 * @callback InstallCommandResolver
 * @param {Iterable<string>} pkgs - List of package names to install.
 * @returns {string[]} Command line, as argument list (argv).
 */

/**
 * Finds the command to install OS packages using PackageKit.
 * Checks for pkgcli and pkcon utilities, returning a function that generates
 * the appropriate installation command with cache refresh if supported.
 *
 * @private
 * @param {Gio.Cancellable|null} cancellable - Optional cancellable for
 * aborting the operation.
 * @returns {Promise<InstallCommandResolver|null>} A function that generates
 * the command line, or null if no working PackageKit CLI is found.
 */
async function findPackageKitInstallCommand(cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const pkgcli = GLib.find_program_in_path('pkgcli');

    if (pkgcli) {
        const argv = [pkgcli, '--json', 'backend'];

        try {
            const stdout = await getSubprocessOutput(argv, cancellable);
            const roles = parsePkgCliRoles(stdout);

            if (roles.includes('install-packages')) {
                if (roles.includes('refresh-cache')) {
                    return pkgs => ['sh', '-c', [
                        shellJoin([pkgcli, 'refresh', 'force']),
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
                        shellJoin([pkcon, 'refresh', 'force']),
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
 * when available. Falls back to native package managers with pkexec.
 *
 * @async
 * @param {Gio.Cancellable|null} cancellable - Optional cancellable
 * for aborting the operation.
 * @returns {Promise<InstallCommandResolver|null>} A function that generates
 * the command line, or null if no suitable installation method is found.
 */
export async function findInstallCommand(cancellable = null) {
    cancellable?.set_error_if_cancelled();

    const packageKit = await findPackageKitInstallCommand(cancellable);

    if (packageKit)
        return packageKit;

    const pkexec = GLib.find_program_in_path('pkexec');

    if (!pkexec)
        return null;

    for (const os of getOsIdsCached()) {
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
 * A function that, given a list of arguments, generates the command line
 * to run the specified command in a terminal emulator.
 *
 * @callback TerminalCommandResolver
 * @param {Iterable<string>} argv - Command line arguments to run in terminal.
 * @returns {string[]} Command line, as argument list (argv).
 */

/**
 * Finds a terminal emulator to run commands in.
 * Checks for GNOME Console (kgx), gnome-terminal, and xdg-terminal-exec in order.
 *
 * @async
 * @param {Gio.Cancellable|null} cancellable - Optional cancellable for aborting the operation.
 * @returns {Promise<TerminalCommandResolver|null>} A function that generates
 * the command line, or null if no suitable terminal is found.
 */
// eslint-disable-next-line @typescript-eslint/require-await
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
 * Combines the results of findTerminalCommand and findInstallCommand to create
 * a complete installation command that runs in a terminal.
 *
 * @async
 * @param {Gio.Cancellable|null} cancellable - Optional cancellable for aborting the operation.
 * @returns {Promise<InstallCommandResolver|null>} A function that,
 * given the list of packages, generates the installation command,
 * wrapped for terminal execution, or null if terminal or install command not found.
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
