// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';
import Gi from 'gi';

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

let cachedOsIds;

function resolveByOsId(filename, distros) {
    if (!cachedOsIds)
        cachedOsIds = getOsIds();

    for (const osId of cachedOsIds) {
        const match = distros[osId];

        if (match)
            return {package: match, filename};
    }

    return {filename};
}

export const packages = {
    Adw: {
        '1': () => resolveByOsId('Adw-1.typelib', {
            alpine: 'libadwaita',
            arch: 'libadwaita',
            debian: 'gir1.2-adw-1',
            fedora: 'libadwaita',
            suse: 'typelib-1_0-Adw-1',
        }),
    },
    Gdk: {
        '3.0': () => resolveByOsId('Gdk-3.0.typelib', {
            alpine: 'gtk+3.0',
            arch: 'gtk3',
            debian: 'gir1.2-gtk-3.0',
            fedora: 'gtk3',
            suse: 'typelib-1_0-Gtk-3_0',
        }),
        '4.0': () => resolveByOsId('Gdk-4.0.typelib', {
            alpine: 'gtk4.0',
            arch: 'gtk4',
            debian: 'gir1.2-gtk-4.0',
            fedora: 'gtk4',
            suse: 'typelib-1_0-Gtk-4_0',
        }),
    },
    Gtk: {
        '3.0': () => resolveByOsId('Gtk-3.0.typelib', {
            alpine: 'gtk+3.0',
            arch: 'gtk3',
            debian: 'gir1.2-gtk-3.0',
            fedora: 'gtk3',
            suse: 'typelib-1_0-Gtk-3_0',
        }),
        '4.0': () => resolveByOsId('Gtk-4.0.typelib', {
            alpine: 'gtk4.0',
            arch: 'gtk4',
            debian: 'gir1.2-gtk-4.0',
            fedora: 'gtk4',
            suse: 'typelib-1_0-Gtk-4_0',
        }),
    },
    Handy: {
        '1': () => resolveByOsId('Handy-1.typelib', {
            alpine: 'libhandy1',
            arch: 'libhandy',
            debian: 'gir1.2-handy-1',
            fedora: 'libhandy',
            suse: 'typelib-1_0-Handy-1_0',
        }),
    },
    Pango: {
        '1.0': () => resolveByOsId('Pango-1.0.typelib', {
            alpine: 'pango',
            arch: 'pango',
            debian: 'gir1.2-pango-1.0',
            fedora: 'pango',
            suse: 'typelib-1_0-Pango-1_0',
        }),
    },
    Vte: {
        '2.91': () => resolveByOsId('Vte-2.91.typelib', {
            alpine: 'vte3',
            arch: 'vte3',
            debian: 'gir1.2-vte-2.91',
            fedora: 'vte291',
            suse: 'typelib-1_0-Vte-2.91',
        }),
        '3.91': () => resolveByOsId('Vte-3.91.typelib', {
            alpine: 'vte3-gtk4',
            arch: 'vte4',
            debian: 'gir1.2-vte-3.91',
            fedora: 'vte291-gtk4',
            suse: 'typelib-1_0-Vte-3_91',
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

            const {package: pkg, filename} = resolver();

            if (pkg)
                missingPackages.add(pkg);
            else
                missingFiles.add(filename);
        }
    }

    if (missingPackages.size > 0 || missingFiles.size > 0)
        throw new MissingDependencies(missingPackages, missingFiles);

    return found;
}
