# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

FROM docker.io/library/alpine:3.19 AS base

RUN apk add --update --no-cache openrc gjs dbus polkit expect

COPY files /

RUN rc-update add dbus && \
	rc-update add polkit && \
	adduser -D -G users testuser

STOPSIGNAL SIGKILL
CMD ["/sbin/init"]
