# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Asset Management
- **Download Assets**: `node scripts/download-assets.mjs`
  - Downloads images, sounds, and fonts from the target showcase site into the `public/` directory.
  - Uses `docs/research/resource-urls.json` as the source list.

## Architecture & Structure

The project is a clone of a horse racing game. The current structure is focused on asset acquisition and design reference:

- `public/`: Contains all game assets.
  - `css/`: Stylesheets and webfonts.
  - `sounds/`: Game audio files (MP3).
  - `sprites/`: Game imagery, including a large set of parallax background frames in `bg_track/` and gate animations in `cage_gates/`.
- `docs/`: Research and design references.
  - `design-references/`: Screenshots and layout guides for desktop, mobile, and tablet views.
  - `research/`: Data used for asset scraping and component analysis.
- `scripts/`: Utility scripts for maintaining the asset library.

## Project Context
The goal is to reimplement the horse racing game. The development strategy is to use the captured assets and design references to rebuild the game logic and UI from scratch rather than copying the original JavaScript source.
