# HydroChill Intelligence

Smart HVAC pre-cooling dashboard. ESP32 reads temperature, cistern level, and runs a misting pump; pushes telemetry to Firebase Realtime Database every 5 seconds. The PWA subscribes to the same database for live updates and can send commands back to the device.

## Architecture

```
ESP32 ──telemetry──► Firebase RTDB ──onValue──► PWA (this repo)
ESP32 ◄──commands── Firebase RTDB ◄────set──── PWA
```

- **`/coolgrid/telemetry`** — ESP32 writes sensor data here every 5s
- **`/coolgrid/cmd`** — PWA writes pump commands (`ON` / `OFF` / `AUTO`) here; ESP32 streams it

## Files

| File | Purpose |
|---|---|
| `index.html` | The dashboard — single-page PWA, Firebase modular SDK v10 |
| `manifest.webmanifest` | PWA install metadata (name, icons, theme color) |
| `sw.js` | Service worker — offline shell, versioned cache |
| `icon-192.png` / `icon-512.png` / `icon-maskable-512.png` | App icons |
| `firmware_firebase.ino` | ESP32 firmware (Arduino) |

## Hardware

| Component | Pin | Notes |
|---|---|---|
| DS18B20 (water) | GPIO 22 | OneWire, dedicated pin |
| DS18B20 (condenser) | GPIO 23 | OneWire, dedicated pin |
| HRLV-MaxSonar PW | GPIO 21 | Cistern level — currently in validation |
| Relay (pump) | GPIO 26 | Active-LOW |

Tank operating range: **3.5 cm (full) → 14 cm (empty)**.

## Deploy

1. Enable **GitHub Pages**: Settings → Pages → Source: `main` / root.
2. App will be live at `https://<username>.github.io/<repo-name>/`.
3. To push an update, bump `CACHE_VERSION` in `sw.js` so returning users get the new shell.

## Firmware setup

1. Open `firmware_firebase.ino` in Arduino IDE.
2. Edit WiFi SSID/password at top of file.
3. Install libraries: `Firebase ESP Client` (mobizt), `OneWire`, `DallasTemperature`.
4. Board: ESP32 Dev Module. Upload, monitor at 115200 baud.

## Firebase

- Project: `coolgrid-prototype`
- Region: `asia-southeast1`
- Auth user (for device): must exist in Authentication → Users
- RTDB rules (prototype):
  ```json
  {
    "rules": {
      "coolgrid": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
  ```

## Known caveats

- Ultrasonic readings (HRLV-MaxSonar) not yet trusted for small-tank geometry — block-safety override is currently disabled in firmware.
- Service worker caches aggressively; bump `CACHE_VERSION` in `sw.js` on every meaningful change.
