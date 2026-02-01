# SPDX-FileCopyrightText: 2025 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

FROM quay.io/centos/centos:10 AS base

RUN dnf install -y --nodocs --setopt install_weak_deps=False pam systemd gjs polkit expect && \
	dnf clean all -y

COPY files /

RUN systemctl set-default multi-user.target && \
	systemctl mask systemd-oomd low-memory-monitor rtkit-daemon udisks2 getty console-getty systemd-udev-trigger systemd-udevd && \
	chmod u+rw /etc/shadow && \
	truncate --size 0 /etc/machine-id && \
	adduser -m -U -G users testuser

STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]

FROM base AS packagekit

RUN dnf install -y --nodocs --setopt install_weak_deps=False PackageKit && \
	rm /etc/polkit-1/rules.d/allow-pkexec.rules && \
	dnf clean all -y
