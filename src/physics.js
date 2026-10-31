import * as THREE from 'three';

export class FlightPhysics {
  constructor(airplaneMesh) {
    this.airplane = airplaneMesh;

    // State Variables
    this.position = new THREE.Vector3(0, 150, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ'); // Yaw Pitch Roll order
    this.quaternion = new THREE.Quaternion();

    // Flight Dynamics Constants & Limits
    this.minSpeed = 15;      // Stall speed limit
    this.maxSpeed = 120;     // Max speed limit
    this.speed = 45;         // Initial cruising speed (m/s)
    this.throttle = 0.5;     // 0.0 to 1.0

    this.turnRate = 1.3;      // Radians per sec for turning left/right (yaw)
    this.maxPitchAngle = 0.45; // Max pitch angle ~25 degrees
    this.maxRollAngle = 0.55;  // Max bank angle ~31 degrees

    // Current Euler angles
    this.currentYaw = 0;
    this.currentPitch = 0;
    this.currentRoll = 0;

    // Direct Directional Inputs (-1.0 to 1.0)
    this.inputUpDown = 0;    // +1.0 = Move Up, -1.0 = Move Down
    this.inputLeftRight = 0; // -1.0 = Move Left, +1.0 = Move Right

    // Apply initial position to airplane
    this.airplane.position.copy(this.position);
    this.airplane.quaternion.copy(this.quaternion);
  }

  setInputs(upDown, leftRight, yaw = 0, throttleDelta = 0) {
    this.inputUpDown = THREE.MathUtils.clamp(upDown, -1, 1);
    this.inputLeftRight = THREE.MathUtils.clamp(leftRight, -1, 1);

    if (throttleDelta !== 0) {
      this.throttle = THREE.MathUtils.clamp(this.throttle + throttleDelta, 0, 1);
    }
  }

  setThrottle(targetThrottle) {
    this.throttle = THREE.MathUtils.clamp(targetThrottle, 0, 1);
  }

  update(delta) {
    if (delta > 0.1) delta = 0.1; // Cap delta to prevent huge steps on lag

    // 1. Target Speed based on Throttle
    const targetSpeed = THREE.MathUtils.lerp(this.minSpeed, this.maxSpeed, this.throttle);
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, delta * 2.0);

    // 2. Yaw (Heading turn): turning left (-1) turns left on screen (positive yaw), turning right (+1) turns right on screen (negative yaw)
    const yawDelta = -this.inputLeftRight * this.turnRate * delta;
    this.currentYaw += yawDelta;

    // 3. Target Pitch & Roll for visual orientation and movement direction
    // Input UP (+1) tilts nose UP (-pitch), Input DOWN (-1) tilts nose DOWN (+pitch)
    const targetPitch = -this.inputUpDown * this.maxPitchAngle;
    // Input LEFT (-1) banks left (-roll: left wing dips down), Input RIGHT (+1) banks right (+roll: right wing dips down)
    const targetRoll = this.inputLeftRight * this.maxRollAngle;

    // Smoothly interpolate current pitch & roll towards targets (auto-leveling when input is 0)
    const lerpFactor = delta * 5.0;
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, targetPitch, lerpFactor);
    this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetRoll, lerpFactor);

    // Update Quaternion from Euler YXZ
    const euler = new THREE.Euler(this.currentPitch, this.currentYaw, this.currentRoll, 'YXZ');
    this.quaternion.setFromEuler(euler);

    // 4. Movement Physics (Forward Vector * Speed)
    // Airplane local forward is +Z in Three.js model orientation
    const moveDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);

    // Move Airplane
    const step = moveDirection.clone().multiplyScalar(this.speed * delta);
    this.position.add(step);

    // Enforce minimum ground height (sea level at Y = 5)
    if (this.position.y < 5) {
      this.position.y = 5;
      if (this.currentPitch > 0) {
        this.currentPitch = 0; // Prevent diving below ground
      }
    }

    // Update Mesh position and orientation
    this.airplane.position.copy(this.position);
    this.airplane.quaternion.copy(this.quaternion);
  }

  getSpeedKmH() {
    return Math.round(this.speed * 3.6); // Convert m/s to km/h
  }

  getAltitudeMeters() {
    return Math.round(Math.max(0, this.position.y));
  }

  getHeadingDegrees() {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    let angle = Math.atan2(-forward.x, forward.z) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const rounded = Math.round(angle);
    return rounded === 360 || Object.is(rounded, -0) ? 0 : rounded;
  }

  getHeadingCardinal() {
    const deg = this.getHeadingDegrees();
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  }
}
