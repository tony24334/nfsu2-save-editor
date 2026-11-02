# NFS Underground 2 — Save Editor (Web Edition)

Free, client-side browser utility to edit **Need for Speed Underground 2** career save files. 100% client-side privacy, zero server uploads.

## Live Web App
- **Original editor:** [Open NFSU2 Save Editor](https://nfsu2.divon.eu/)

![NFS Underground 2 Save Editor preview](assets/web.png)

## Key Features
- **Profile & Bank Editor:** Safely rename your career profile (up to 7 ASCII characters) and set up to $999,999,999 career cash.
- **5-Slot Career Garage Manager:** Inspect, unlock, clear, or modify performance tiers (Stock, Street, Pro, Extreme) across all 5 career garage slots.
- **40+ Built-in Car Injector Presets:** Inject Story/Boss icons (Rachel's 350Z, Caleb's Pontiac GTO, Nikki's Mustang, Snoop Dogg's Escalade), Custom Player Builds, EU/US Regional Exclusives (Peugeot 106, Opel Corsa, Honda Civic Si, Acura RSX), and all 26 Factory Stock vehicles.
- **Safe Career Add-ons vs. 100% Sandbox Mode:**
  - *Safe Career Add-ons:* Unlock Widebody kits, TJ Unique upgrades, all 25 Car Lot vehicles, and hidden map shops while keeping active storyline races intact.
  - *100% Sandbox Mode:* Unlock all 5 sponsor garage slots, the entire Bayview map (Stage 5), and 100% of shop catalogs in one click.
- **Custom .JSON Car Patches:** Export and import standalone vehicle patches between save files.

## Fork Enhancements — Per-Car Unique Performance

This fork extends the original editor with per-vehicle Unique Performance controls, integrated directly into the existing career garage cards.

- **Per-car controls:** Expand **Unique Performance** on any occupied garage slot to toggle upgrades independently for that vehicle. No separate editor page is required.
- **Nine upgrade categories:** Weight Reduction, Transmission, NOS, Engine, Turbo, Suspension, Brakes, ECU, and Tires.
- **Bulk actions:** Use **Enable All** or **Disable All** within a garage slot. Changes to one slot do not automatically apply to other cars.
- **Original interface retained:** Existing garage actions, performance-tier selectors, car injection, and JSON patch features remain available.
- **Save checksums:** The download flow recalculates the Block A, Block B, and header CRCs before exporting a modified 54,966-byte `20CM` career save. The automatic `.bak` backup retains the original file.
- **Localized code changes:** Most fork-specific behavior lives in [`js/unique-integrated.js`](js/unique-integrated.js). The original minified bundle has a small bridge exposing the in-memory save editor to that script, and [`index.html`](index.html) loads the additional script.

### How to Use

1. Open `index.html` (or your deployed fork) and load a compatible NFS Underground 2 career save.
2. Locate the vehicle in the garage and expand its **Unique Performance** section.
3. Check or uncheck the upgrades to apply to that vehicle. Repeat for other vehicles as needed.
4. Use the editor's normal **Download Save** button, back up your original save, then import the modified file into the game.

### Implementation Notes and Limitations

The nine controls write little-endian 32-bit values (`0` or `1`) at the following offsets, relative to each car slot. Career garage slot data starts at `0x5870` and has a `0x7F2` stride.

| Upgrade | Relative offset | Evidence |
| --- | --- | --- |
| Weight Reduction | `+0x2E8` | Independently tested in game |
| Transmission | `+0x2EC` | Inferred category mapping |
| NOS | `+0x2F0` | Inferred category mapping |
| Engine | `+0x2F4` | Independently tested in game |
| Turbo | `+0x2F8` | Inferred category mapping |
| Suspension | `+0x2FC` | Inferred category mapping |
| Brakes | `+0x300` | Inferred category mapping |
| ECU | `+0x304` | Inferred category mapping |
| Tires | `+0x308` | Inferred category mapping |

Weight Reduction and Engine were tested individually using in-game performance comparisons. A save with all nine values enabled also loaded and showed additional performance gains, **but that does not independently establish every remaining category mapping or prove that all nine upgrades are active**. The editor is intended for compatible NFSU2 career saves; always test changes on a backup. The original editor's general *Special Parts* unlock operation is distinct from these per-vehicle installed-upgrade controls.

## Backup Warning
Always back up your save files before making changes. This lets you restore your original progress if something goes wrong.

## Save File Location (Windows 10 / 11)
Standard path for Windows Explorer (`Win + R`):
`%LOCALAPPDATA%\NFS Underground 2`

## Running Locally (Offline Mode)

You don't need an internet connection to edit your save files:

1. **Original web app:** Visit **[nfsu2.divon.eu](https://nfsu2.divon.eu)** and click **"Install App"** (PWA) in your browser's address bar to use the original editor offline. The original website does **not** necessarily include this fork's modifications.
2. **Standalone archive:**
   - Download this fork or clone the repository.
   - Open `index.html` in a modern browser to edit local save files.
   - *Note:* To use `Try Demo` or `100% Sandbox` templates locally, run a local HTTP server in the project folder (for example, `python -m http.server 8000`) because browsers may restrict `file://` requests.

## Credits and Disclaimer

Based on [Starladdey/nfsu2-save-editor](https://github.com/Starladdey/nfsu2-save-editor). Preserve the original project's license and copyright notices when redistributing this fork.

Unofficial non-commercial fan project. Not affiliated with, endorsed, or sponsored by Electronic Arts Inc. (EA) or EA Black Box.
