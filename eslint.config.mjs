// SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import {defineConfig} from 'eslint/config';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';
// @ts-ignore
import gnome from 'eslint-config-gnome';

export default defineConfig([
    {
        files: ['*.js', '*.mjs', 'tests/*.js'],
        plugins: {gnome},
        extends: ['gnome/recommended'],
        rules: {
            camelcase: ['error', {
                properties: 'never',
            }],
            'consistent-return': 'error',
            'eqeqeq': ['error', 'smart'],
            'key-spacing': ['error', {
                mode: 'minimum',
                beforeColon: false,
                afterColon: true,
            }],
            'prefer-arrow-callback': 'error',
        },
    },
    {
        files: [
            'ambient.d.ts',
            'gjs-typelib-installer.js',
            'tests/test.js',
            'tests/e2e-test.js',
        ],
        plugins: {jsdoc, tseslint},
        extends: [
            'tseslint/strictTypeChecked',
            'tseslint/stylisticTypeChecked',
            'jsdoc/flat/recommended-typescript-flavor-error',
        ],
        rules: {
            'no-extra-parens': ['error', 'all', {
                conditionalAssign: false,
                nestedBinaryExpressions: false,
                returnAssign: false,
                allowParensAfterCommentPattern: '@type',
            }],
            'jsdoc/tag-lines': ['error', 'always', {
                startLines: 1,
                count: 0,
            }],
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
    },
    {
        files: [
            'tests/*.js',
        ],
        plugins: {jsdoc},
        rules: {
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/require-returns-description': 'off',
        },
    },
    {
        files: [
            'gjs-typelib-installer.js',
        ],
        plugins: {jsdoc},
        rules: {
            'jsdoc/require-description': ['error', {
                exemptedBy: ['inheritdoc', 'private'],
            }],
            'jsdoc/require-description-complete-sentence': 'error',
            'jsdoc/require-hyphen-before-param-description': 'error',
            'jsdoc/require-asterisk-prefix': 'error',
        },
    },
]);
