#!/usr/bin/env bash

# SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

set -e

service="$1"
shift

trap 'podman compose down -v "$service"' EXIT

podman compose up --build --wait --force-recreate "$service"
podman compose exec -u testuser "$service" tests/e2e-tests.sh "$@"
