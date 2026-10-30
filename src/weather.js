import * as THREE from 'three';

export const WEATHER_TYPES = {
  CLEAR: 'CLEAR',
  CLOUDY: 'CLOUDY',
  RAIN: 'RAIN',
  SNOW: 'SNOW'
};

export class WeatherManager {
  constructor(scene, camera, dirLight, ambientLight) {
    this.scene = scene;
    this.camera = camera;
    this.dirLight = dirLight;
    this.ambientLight = ambientLight;

    this.currentWeather = WEATHER_TYPES.CLEAR;

    // Cloud Group
    this.cloudsGroup = new THREE.Group();
    this.scene.add(this.cloudsGroup);
    this.clouds = [];
    this.cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85,
      flatShading: true
    });

    // Particle System (Rain / Snow)
    this.particleCount = 2000;
    this.particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 300;
      positions[i * 3 + 1] = Math.random() * 150;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300;

      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = -20 - Math.random() * 20;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleVelocities = velocities;

    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.8,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(this.particleGeo, this.particleMaterial);
    this.scene.add(this.particleSystem);

    this._spawnProceduralClouds();
  }

  _spawnProceduralClouds() {
    const cloudGeo = new THREE.DodecahedronGeometry(12, 1);
    const numClouds = 25;

    for (let i = 0; i < numClouds; i++) {
      const cloudPuffGroup = new THREE.Group();
      const puffsInCloud = 5 + Math.floor(Math.random() * 6);

      for (let p = 0; p < puffsInCloud; p++) {
        const puff = new THREE.Mesh(cloudGeo, this.cloudMaterial);
        puff.position.set(
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 25
        );
        const s = 0.6 + Math.random() * 0.8;
        puff.scale.set(s, s * 0.7, s);
        puff.castShadow = true;
        cloudPuffGroup.add(puff);
      }

      // Random position high in sky
      cloudPuffGroup.position.set(
        (Math.random() - 0.5) * 1200,
        180 + Math.random() * 70,
        (Math.random() - 0.5) * 1200
      );

      this.cloudsGroup.add(cloudPuffGroup);
      this.clouds.push(cloudPuffGroup);
    }
  }

  setWeather(weatherType) {
    if (!WEATHER_TYPES[weatherType]) return;
    this.currentWeather = weatherType;

    const bgFog = this.scene.fog;

    switch (this.currentWeather) {
      case WEATHER_TYPES.CLEAR:
        this.dirLight.color.setHex(0xfffaed);
        this.dirLight.intensity = 1.4;
        this.ambientLight.color.setHex(0x94a3b8);
        this.ambientLight.intensity = 0.8;
        this.scene.background = new THREE.Color(0xcbe3f7);
        if (bgFog) {
          bgFog.color.setHex(0xcbe3f7);
          bgFog.density = 0.0008;
        }
        this.cloudMaterial.color.setHex(0xffffff);
        this.cloudMaterial.opacity = 0.85;
        this.particleMaterial.opacity = 0;
        break;

      case WEATHER_TYPES.CLOUDY:
        this.dirLight.color.setHex(0xe2e8f0);
        this.dirLight.intensity = 0.9;
        this.ambientLight.color.setHex(0x64748b);
        this.ambientLight.intensity = 0.9;
        this.scene.background = new THREE.Color(0x94a3b8);
        if (bgFog) {
          bgFog.color.setHex(0x94a3b8);
          bgFog.density = 0.0018;
        }
        this.cloudMaterial.color.setHex(0xe2e8f0);
        this.cloudMaterial.opacity = 0.95;
        this.particleMaterial.opacity = 0;
        break;

      case WEATHER_TYPES.RAIN:
        this.dirLight.color.setHex(0x475569);
        this.dirLight.intensity = 0.5;
        this.ambientLight.color.setHex(0x334155);
        this.ambientLight.intensity = 0.7;
        this.scene.background = new THREE.Color(0x475569);
        if (bgFog) {
          bgFog.color.setHex(0x475569);
          bgFog.density = 0.0035;
        }
        this.cloudMaterial.color.setHex(0x475569);
        this.cloudMaterial.opacity = 0.95;

        // Rain setup
        this.particleMaterial.color.setHex(0x93c5fd);
        this.particleMaterial.size = 0.9;
        this.particleMaterial.opacity = 0.75;

        for (let i = 0; i < this.particleCount; i++) {
          this.particleVelocities[i * 3 + 1] = -50 - Math.random() * 30; // Fast rain
        }
        break;

      case WEATHER_TYPES.SNOW:
        this.dirLight.color.setHex(0xcbd5e1);
        this.dirLight.intensity = 0.7;
        this.ambientLight.color.setHex(0x94a3b8);
        this.ambientLight.intensity = 0.85;
        this.scene.background = new THREE.Color(0xe2e8f0);
        if (bgFog) {
          bgFog.color.setHex(0xe2e8f0);
          bgFog.density = 0.0028;
        }
        this.cloudMaterial.color.setHex(0xf1faee);
        this.cloudMaterial.opacity = 0.9;

        // Snow setup
        this.particleMaterial.color.setHex(0xffffff);
        this.particleMaterial.size = 1.8;
        this.particleMaterial.opacity = 0.85;

        for (let i = 0; i < this.particleCount; i++) {
          this.particleVelocities[i * 3 + 1] = -12 - Math.random() * 8; // Gentle snow float
        }
        break;
    }
  }

  cycleNextWeather() {
    const list = [WEATHER_TYPES.CLEAR, WEATHER_TYPES.CLOUDY, WEATHER_TYPES.RAIN, WEATHER_TYPES.SNOW];
    const currentIndex = list.indexOf(this.currentWeather);
    const nextIndex = (currentIndex + 1) % list.length;
    this.setWeather(list[nextIndex]);
    return list[nextIndex];
  }

  update(delta, playerPos) {
    // 1. Move Clouds slowly & wrap relative to player
    this.clouds.forEach(cloud => {
      cloud.position.x += 3.0 * delta; // Wind drift

      // Wrap around player box
      if (cloud.position.x - playerPos.x > 700) cloud.position.x -= 1400;
      if (cloud.position.x - playerPos.x < -700) cloud.position.x += 1400;
      if (cloud.position.z - playerPos.z > 700) cloud.position.z -= 1400;
      if (cloud.position.z - playerPos.z < -700) cloud.position.z += 1400;
    });

    // 2. Update Weather Particles (Rain / Snow) relative to player camera
    if (this.currentWeather === WEATHER_TYPES.RAIN || this.currentWeather === WEATHER_TYPES.SNOW) {
      this.particleSystem.position.copy(playerPos);

      const positions = this.particleGeo.attributes.position.array;

      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3] += this.particleVelocities[i * 3] * delta;
        positions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * delta;

        // Reset particle top when it hits low height relative to center
        if (positions[i * 3 + 1] < -80) {
          positions[i * 3] = (Math.random() - 0.5) * 300;
          positions[i * 3 + 1] = 100 + Math.random() * 50;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
        }
      }

      this.particleGeo.attributes.position.needsUpdate = true;
    }
  }
}
