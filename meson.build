# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

project(
  'gjs-typelib-installer',
  meson_version: '>= 1.3.0',
  license: 'MIT',
  license_files: 'LICENSE',
)

source = files('installer.js')
build_script = files('build.js')
gjs = find_program('gjs')
build_command = [gjs, build_script, '--input', '@INPUT@', '--output', '@OUTPUT@', '--']

output_name = get_option('output_name')
install_dir = get_option('install_dir')
install_tag = get_option('install_tag')
typelibs = get_option('typelibs')

output = custom_target(
  command: build_command + typelibs,
  input: source,
  output: output_name,
  install: install_dir != '',
  install_dir: [(install_dir != '') ? install_dir : false],
  install_tag: [(install_tag != '') ? install_tag : false],
)

if get_option('tests')
  subdir('tests')
endif
