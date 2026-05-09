#!/bin/bash
# Spacy EC2 bootstrap — paste this verbatim into EC2 launch wizard's
# "User data" field. Runs once at first boot, idempotent on re-runs.
#
# What it does:
#  - Installs docker + compose, bun, build tools.
#  - Writes /var/log/sev-status.log with SEV-SNP + /dev/sev-guest probe.
#  - Builds AMD's sev-guest-get-report and installs it to /usr/local/bin.
#  - Creates /opt/spacy, /etc/spacy, /var/lib/spacy directories.
#
# It does NOT clone the repo, write secrets, or start anything — those
# happen in the post-SSH bootstrap (`scripts/post-launch-deploy.sh`).

set -euxo pipefail
exec > >(tee /var/log/spacy-bootstrap.log) 2>&1

dnf update -y
dnf install -y docker git jq curl unzip tar gzip \
  make gcc kernel-devel kernel-headers openssl-devel

# Docker daemon
systemctl enable --now docker
usermod -aG docker ec2-user

# Docker Compose v2 plugin (system-level so all users see it)
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Bun for building the web frontend on host (Caddy bind-mounts the dist).
sudo -u ec2-user bash -c 'curl -fsSL https://bun.sh/install | bash'
ln -sf /home/ec2-user/.bun/bin/bun /usr/local/bin/bun

# --- SEV-SNP attestation surface ---
{
  if dmesg | grep -qi "SEV-SNP"; then
    echo "[OK]   SEV-SNP detected in dmesg"
  else
    echo "[FAIL] SEV-SNP not detected — was the instance launched with the toggle on?"
  fi

  if [ -e /dev/sev-guest ]; then
    echo "[OK]   /dev/sev-guest present"
    chmod 666 /dev/sev-guest
  else
    echo "[FAIL] /dev/sev-guest missing — kernel too old or SEV-SNP off"
  fi
} > /var/log/sev-status.log

# Build AMD's sev-guest reference utility (produces real attestation reports).
# We tolerate failures here so that the instance still boots if upstream
# changes; the API can fall back to MOCK_ATTESTATION until this is fixed.
(
  cd /tmp
  if [ ! -d sev-guest ]; then
    git clone --depth 1 https://github.com/AMDESE/sev-guest.git || true
  fi
  if [ -d sev-guest ]; then
    cd sev-guest
    make || true
    if [ -x sev-guest-get-report ]; then
      install -m 0755 sev-guest-get-report /usr/local/bin/sev-guest-get-report
      echo "[OK]   sev-guest-get-report installed" >> /var/log/sev-status.log
    else
      echo "[WARN] sev-guest-get-report build failed; fix manually post-boot" >> /var/log/sev-status.log
    fi
  fi
)

# Spacy work directories with right ownership.
install -d -o ec2-user -g ec2-user /opt/spacy /etc/spacy /var/lib/spacy/postgres /var/lib/spacy/caddy

echo "spacy bootstrap complete at $(date -u +%FT%TZ)" >> /var/log/spacy-bootstrap.log
