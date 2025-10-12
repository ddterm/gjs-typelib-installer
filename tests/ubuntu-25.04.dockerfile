# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

FROM docker.io/library/ubuntu:25.04 AS base

RUN apt-get update && apt-get install -y --no-install-recommends systemd gjs pkexec expect

COPY files /

RUN systemctl set-default multi-user.target && \
	systemctl mask systemd-oomd low-memory-monitor rtkit-daemon udisks2 getty console-getty systemd-udev-trigger systemd-udevd && \
	chmod u+rw /etc/shadow && \
	truncate --size 0 /etc/machine-id && \
	useradd -m -U -G users testuser

STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]

FROM base AS packagekit

RUN apt-get update && apt-get install -y --no-install-recommends packagekit-tools && \
	rm /etc/polkit-1/rules.d/allow-pkexec.rules
