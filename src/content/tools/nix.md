---
title: "Nix"
description: "Purely functional package manager and OS configuration system — create fully reproducible development environments where every dependency is pinned to the exact same version on every machine."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (LGPL)"
website: "https://nixos.org"
github: "https://github.com/NixOS/nix"
tags: [developer-tools, devex, package-manager, reproducibility, open-source, linux, macos]
pros:
  - "Truly reproducible environments — same `flake.lock` = identical deps on every machine"
  - "Atomic upgrades and rollbacks — broken upgrade? Roll back with one command"
  - "Multiple versions of the same tool side-by-side without conflicts"
  - "nix-shell / devShells: per-project environments activated automatically with direnv"
  - "NixOS: entire OS configuration declared in Nix files, reproducible machines"
cons:
  - "Steep learning curve — Nix language is unlike other config languages"
  - "Documentation can be dense and fragmented"
  - "Binary cache misses cause long build times"
  - "Not beginner-friendly — significant investment before productivity"
date: "2026-04-02"
---

## Overview

Nix takes a radically different approach to package management: every package is built from source with all inputs hashed, and packages with different inputs get different store paths (`/nix/store/hash-name-version`). This means no conflicts, full reproducibility, and atomic rollbacks. Increasingly popular among teams that need identical dev environments across Linux and macOS.

## Installation

```bash
# Multi-user install (recommended)
sh <(curl -L https://nixos.org/nix/install) --daemon

# Enable flakes (modern Nix)
echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
```

## Dev Shells with Flakes

The modern way to define per-project environments:

```nix
# flake.nix
{
  description = "Node.js development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.pnpm
            postgresql_16
            redis
            awscli2
          ];

          shellHook = ''
            echo "Dev environment loaded"
            export DATABASE_URL="postgresql://localhost/myapp_dev"
          '';
        };
      }
    );
}
```

```bash
# Enter the dev shell
nix develop

# Or with direnv (auto-activate on cd)
echo "use flake" > .envrc
direnv allow
```

## Running Tools Without Installing

```bash
# Run a tool without permanently installing it
nix run nixpkgs#cowsay -- "Hello Nix"

# Open a temporary shell with tools
nix shell nixpkgs#httpie nixpkgs#jq

# Try a new Node version without switching your default
nix run nixpkgs#nodejs_22 -- --version
```

## Home Manager (User Config)

Manage your dotfiles and user packages with Nix:

```nix
# ~/.config/home-manager/home.nix
{ config, pkgs, ... }: {
  home.packages = with pkgs; [
    ripgrep
    fd
    bat
    lazygit
    gh
  ];

  programs.git = {
    enable = true;
    userName = "Your Name";
    userEmail = "you@example.com";
    extraConfig.init.defaultBranch = "main";
  };

  programs.zsh = {
    enable = true;
    autosuggestion.enable = true;
  };
}
```

## Nix vs Other Env Managers

| | Nix | Docker | mise/asdf | homebrew |
|--|-----|--------|-----------|---------|
| Reproducibility | Perfect | Near-perfect | Version-level | Low |
| Language isolation | ✅ | ✅ | ✅ | ❌ |
| Rollback | ✅ | ✅ | ❌ | ❌ |
| Learning curve | Very high | Medium | Low | Very low |
| macOS support | ✅ | ✅ | ✅ | ✅ |
