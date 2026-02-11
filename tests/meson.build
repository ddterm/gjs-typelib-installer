# SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

test(
  'test',
  gjs,
  args: [files('test.js'), '--input', output],
  protocol: 'tap',
)

test(
  'e2e-test',
  gjs,
  args: [files('e2e-test.js'), '--input', output, '--'],
  timeout: 120,
)
