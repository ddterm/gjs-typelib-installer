# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

FROM docker.io/opensuse/leap:15.6 AS base

RUN zypper --non-interactive install --no-recommends -f systemd gjs pkexec expect && \
	zypper clean --all

COPY files /

RUN systemctl set-default multi-user.target && \
	systemctl mask systemd-oomd low-memory-monitor rtkit-daemon udisks2 getty console-getty systemd-udev-trigger systemd-udevd && \
	chmod u+rw /etc/shadow && \
	truncate --size 0 /etc/machine-id && \
	useradd -m -U -G users testuser

STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]

FROM base AS packagekit

RUN zypper --non-interactive install --no-recommends -f PackageKit && \
	rm /etc/polkit-1/rules.d/allow-pkexec.rules && \
	zypper clean --all
