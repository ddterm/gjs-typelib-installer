# SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

test(
  'test',
  gjs,
  args: [files('test.js'), '--no-exit-code', '--input', output],
  protocol: 'tap',
)

expect = find_program('expect', required: false, disabler: true)

test(
  'e2e-test',
  expect,
  args: ['-f', files('yes.expect'), gjs.full_path(), files('e2e-test.js'), '--input', output],
  timeout: 120,
)
