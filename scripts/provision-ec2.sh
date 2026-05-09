#!/usr/bin/env bash
set -euo pipefail

# Install Docker + Compose plugin on Amazon Linux 2023
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Install sev-guest utility for SEV-SNP attestation reports
sudo dnf install -y sevtool

# Verify SEV-SNP is active. The instance must have been launched with
# AMD SEV-SNP=Enabled — this cannot be flipped on a running instance.
if ! sudo dmesg | grep -q "SEV-SNP: Following memory encryption features"; then
  echo "FATAL: SEV-SNP not active. Was the instance launched with SEV-SNP=Enabled?"
  exit 1
fi

# Pull and start the prod stack
cd /opt/spacy
sudo docker compose -f deploy/docker-compose.prod.yml up -d
