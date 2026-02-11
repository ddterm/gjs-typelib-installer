# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

FROM docker.io/library/alpine:3.22 AS base

RUN apk add --no-cache bash openrc gjs dbus polkit expect meson

COPY files /

RUN rc-update add dbus && \
	rc-update add polkit && \
	adduser -u 1001 -D -G users testuser

STOPSIGNAL SIGKILL
CMD ["/sbin/init"]
