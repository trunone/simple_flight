import * as THREE from 'three';
import { Airplane } from './airplane.js';
import { FlightPhysics } from './physics.js';
import { TerrainManager } from './terrain.js';
import { WeatherManager, WEATHER_TYPES } from './weather.js';
import { ControlsManager } from './controls.js';
import { HUDManager } from './hud.js';

class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');

    // Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcbe3f7);
    this.scene.fog = new THREE.FogExp2(0xcbe3f7, 0.0008);

    // Camera Setup (3rd Person View)
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      2500
    );

    // Camera Modes: 0 = Chase 3rd Person, 1 = Close Smooth 3rd Person, 2 = Far Orbit 3rd Person
    this.cameraMode = 0;

    // Renderer Setup - Fallback for software / headless environments
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      console.warn('WebGL Context Creation failed with default settings, attempting fallback canvas/renderer...', e);
      this.renderer = new THREE.WebGLRenderer({ antialias: false, failIfMajorPerformanceCaveat: false });
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0x94a3b8, 0.8);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.dirLight.position.set(200, 400, 150);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 1000;
    const d = 300;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // Entities
    this.airplane = new Airplane();
    this.scene.add(this.airplane.mesh);

    this.physics = new FlightPhysics(this.airplane.mesh);
    this.terrain = new TerrainManager(this.scene);

    // Weather Randomizer on Init
    const weatherList = [WEATHER_TYPES.CLEAR, WEATHER_TYPES.CLOUDY, WEATHER_TYPES.RAIN, WEATHER_TYPES.SNOW];
    const initialWeather = weatherList[Math.floor(Math.random() * weatherList.length)];

    this.weather = new WeatherManager(this.scene, this.camera, this.dirLight, this.ambientLight);
    this.weather.setWeather(initialWeather);

    // HUD & Controls
    this.hud = new HUDManager();
    this.controls = new ControlsManager(this.weather, (newWeather) => {
      this.hud.update(this.physics, newWeather);
    });

    // Clock
    this.clock = new THREE.Clock();

    // Event Listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateCamera(delta) {
    // Camera View Modes
    let targetOffset;
    if (this.cameraMode === 0) {
      targetOffset = new THREE.Vector3(0, 3.8, -14.5); // Standard Chase
    } else if (this.cameraMode === 1) {
      targetOffset = new THREE.Vector3(0, 2.2, -8.0);  // Close Chase
    } else {
      targetOffset = new THREE.Vector3(0, 10.0, -28.0); // Wide Orbit
    }

    // Transform camera offset by airplane rotation
    const desiredPos = this.physics.position.clone().add(
      targetOffset.clone().applyQuaternion(this.physics.quaternion)
    );

    // Smoothly lerp camera position
    this.camera.position.lerp(desiredPos, delta * 8.0);

    // Smooth lookAt slightly in front of airplane
    const lookAtTarget = this.physics.position.clone().add(
      new THREE.Vector3(0, 0.8, 12).applyQuaternion(this.physics.quaternion)
    );
    this.camera.lookAt(lookAtTarget);

    // Update Directional light position to follow airplane
    this.dirLight.position.set(
      this.physics.position.x + 180,
      this.physics.position.y + 350,
      this.physics.position.z + 120
    );
    this.dirLight.target = this.airplane.mesh;
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // Camera mode toggle check
    if (this.controls.checkCameraModeToggle()) {
      this.cameraMode = (this.cameraMode + 1) % 3;
    }

    // Controls & Physics
    this.controls.update(this.physics, delta);
    this.physics.update(delta);

    // Airplane Model Animation (Propeller spin, particles)
    this.airplane.update(delta, this.physics.throttle, this.physics.speed);

    // Terrain Infinite Chunk Generation
    this.terrain.update(this.physics.position);

    // Weather Effects
    this.weather.update(delta, this.physics.position);

    // Camera 3rd Person Follow
    this.updateCamera(delta);

    // HUD Display update
    this.hud.update(this.physics, this.weather.currentWeather);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Start Game on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
