export class HUDManager {
  constructor() {
    this.speedValEl = document.getElementById('speed-val');
    this.speedBarEl = document.getElementById('speed-bar');

    this.altitudeValEl = document.getElementById('altitude-val');
    this.altitudeBarEl = document.getElementById('altitude-bar');

    this.headingValEl = document.getElementById('heading-val');
    this.headingDirEl = document.getElementById('heading-dir');

    this.weatherBadgeEl = document.getElementById('weather-badge');
  }

  update(physics, currentWeather) {
    // 1. Speed (KM/H)
    const speed = physics.getSpeedKmH();
    if (this.speedValEl) this.speedValEl.textContent = speed;
    if (this.speedBarEl) {
      const maxSpeedKmH = 120 * 3.6; // ~432 km/h max
      const speedPct = Math.min(100, Math.max(0, (speed / maxSpeedKmH) * 100));
      this.speedBarEl.style.width = `${speedPct}%`;
    }

    // 2. Altitude (Meters)
    const alt = physics.getAltitudeMeters();
    if (this.altitudeValEl) this.altitudeValEl.textContent = alt;
    if (this.altitudeBarEl) {
      const maxAlt = 500;
      const altPct = Math.min(100, Math.max(0, (alt / maxAlt) * 100));
      this.altitudeBarEl.style.width = `${altPct}%`;
    }

    // 3. Heading & Direction
    const headingDeg = physics.getHeadingDegrees();
    const cardinalDir = physics.getHeadingCardinal();
    if (this.headingValEl) this.headingValEl.textContent = `${String(headingDeg).padStart(3, '0')}°`;
    if (this.headingDirEl) this.headingDirEl.textContent = cardinalDir;

    // 4. Weather Badge
    if (this.weatherBadgeEl && currentWeather) {
      this.weatherBadgeEl.textContent = currentWeather;
      this.weatherBadgeEl.className = `hud-badge weather-${currentWeather.toLowerCase()}`;
    }
  }
}
