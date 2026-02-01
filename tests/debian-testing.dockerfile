# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

FROM docker.io/library/debian:testing AS base

RUN apt-get update && apt-get install -y --no-install-recommends systemd gjs pkexec expect x11-common && \
	apt-get clean && \
	apt-get distclean

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
	rm /etc/polkit-1/rules.d/allow-pkexec.rules && \
	apt-get clean && \
	apt-get distclean
