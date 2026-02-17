#!/usr/bin/env gjs

// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

const {GLib, Gio} = imports.gi;
const System = imports.system;

class Report {
    static escape(str, allowLineBreaks = true) {
        const escaped = String(str).replace(/\\|#/g, '\\$&');

        if (allowLineBreaks)
            return escaped.replace(/\n/g, '\n# ');
        else if (escaped.includes('\n'))
            throw new Error('Line breaks not allowed here!');

        return escaped;
    }

    #test_point_id = 0;
    #failed = false;

    constructor() {
        print('TAP version', 13);
    }

    end() {
        print(`1..${this.#test_point_id}`);

        return this.#failed ? 1 : 0;
    }

    #next_test() {
        this.#test_point_id += 1;

        return this.#test_point_id;
    }

    ok(description) {
        print('ok', this.#next_test(), '-', Report.escape(description));
    }

    skip(description) {
        print('ok', this.#next_test(), '-', Report.escape(description, false), '# SKIP');
    }

    notOk(description) {
        this.#failed = true;

        print('not ok', this.#next_test(), '-', Report.escape(description));

        if (description instanceof Error)
            Report.comment(description.stack);
    }

    static comment(text) {
        print('#', Report.escape(text));
    }

    static bailOut(reason) {
        print('Bail out!', Report.escape(reason));

        if (reason instanceof Error)
            Report.comment(reason.stack);
    }
}

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
    const commandLine = resolvedCommand.map(arg => GLib.shell_quote(arg)).join(' ');

    Report.comment(commandLine);

    const [, stdout, , waitStatus] = GLib.spawn_sync(null, resolvedCommand, null, spawnFlags, null);

    try {
        GLib.spawn_check_wait_status(waitStatus);
    } catch (error) {
        Report.comment(new TextDecoder().decode(stdout));

        throw new Error(`${commandLine}: ${error}`, {cause: error});
    }

    return new TextDecoder().decode(stdout).split('\n').filter(Boolean);
}

function test(report, name, resolveFunc) {
    const {packages, filename} = resolveFunc();

    if (!packages) {
        report.skip(`${name}: ${JSON.stringify(filename)} - no known package`);
        return;
    }

    for (const packageName of packages) {
        const files = listFiles(packageName);
        const fileNames = files.map(p => GLib.path_get_basename(p));

        if (fileNames.includes(filename)) {
            report.ok(
                `${name}: package ${JSON.stringify(packageName)} provides file ${JSON.stringify(filename)}`
            );

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
    const report = new Report();
    const typelibFilter = options.lookup(GLib.OPTION_REMAINING, 'as', true);

    for (const [namespace, versions] of Object.entries(installer.packages)) {
        for (const [version, resolveFunc] of Object.entries(versions)) {
            const name = `${namespace}-${version}`;

            if (typelibFilter && !typelibFilter.includes(name)) {
                report.skip(`${name}: not matching command line args`);
                continue;
            }

            try {
                test(report, name, resolveFunc);
            } catch (error) {
                report.notOk(`${name}: ${String(error)}`);
                Report.comment(error.stack);
            }
        }
    }

    const exitCode = report.end();

    return options.lookup('no-exit-code', 'b') ? 0 : exitCode;
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
    'no-exit-code',
    0,
    GLib.OptionFlags.NONE,
    GLib.OptionArg.NONE,
    'Exit with code 0 even if some tests failed. Exit with non-zero code only for fatal errors.',
    null
);

app.add_main_option(
    GLib.OPTION_REMAINING,
    0,
    GLib.OptionFlags.NONE,
    GLib.OptionArg.STRING_ARRAY,
    'Libraries/namespaces to check, in "Namespace-version" format, for example: Gtk-3.0. Check all if not specified.',
    null
);

app.set_option_context_parameter_string('-- [Namespace-version…]');

app.connect('handle-local-options', (_, options) => {
    app.hold();

    main(options).catch(error => {
        Report.bailOut(error);
        return 1;
    }).then(exitCode => {
        app.release();
        System.exit(exitCode);
    });

    return -1;
});

app.connect('activate', () => {});
app.run([System.programInvocationName, ...System.programArgs]);
