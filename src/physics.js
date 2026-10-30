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

    this.pitchRate = 1.2;    // Radians per sec at max input
    this.rollRate = 2.0;     // Radians per sec at max input
    this.yawRate = 0.6;      // Radians per sec at max input

    // Control Inputs (-1.0 to 1.0)
    this.inputPitch = 0;
    this.inputRoll = 0;
    this.inputYaw = 0;

    // Dynamic bank auto-alignment and stabilization factors
    this.autoLevelRollSpeed = 0.8;
    this.liftFactor = 0.08;
    this.gravity = 9.81;

    // Apply initial position to airplane
    this.airplane.position.copy(this.position);
    this.airplane.quaternion.copy(this.quaternion);
  }

  setInputs(pitch, roll, yaw, throttleDelta = 0) {
    this.inputPitch = THREE.MathUtils.clamp(pitch, -1, 1);
    this.inputRoll = THREE.MathUtils.clamp(roll, -1, 1);
    this.inputYaw = THREE.MathUtils.clamp(yaw, -1, 1);

    if (throttleDelta !== 0) {
      this.throttle = THREE.MathUtils.clamp(this.throttle + throttleDelta, 0, 1);
    }
  }

  setThrottle(targetThrottle) {
    this.throttle = THREE.MathUtils.clamp(targetThrottle, 0, 1);
  }

  update(delta) {
    if (delta > 0.1) delta = 0.1; // Cap delta to prevent huge steps on lag

    // 1. Target Speed based on Throttle & Pitch Angle
    // Pitching down increases speed, pitching up decreases speed
    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    const pitchAngleFactor = forwardVec.y; // Positive when pointing up, negative when pointing down

    const targetSpeed = THREE.MathUtils.lerp(this.minSpeed, this.maxSpeed, this.throttle) - (pitchAngleFactor * 25);
    const clampedTargetSpeed = THREE.MathUtils.clamp(targetSpeed, this.minSpeed, this.maxSpeed);

    // Smooth speed change
    this.speed = THREE.MathUtils.lerp(this.speed, clampedTargetSpeed, delta * 1.5);

    // 2. Control Surface Responsiveness scales with speed
    const speedRatio = THREE.MathUtils.clamp(this.speed / 60, 0.4, 1.3);

    // Roll rotation (Z axis local)
    let rollDelta = this.inputRoll * this.rollRate * speedRatio * delta;
    if (this.inputRoll === 0) {
      // Auto-level roll when no input
      const currentEuler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
      rollDelta = -currentEuler.z * this.autoLevelRollSpeed * delta;
    }

    // Pitch rotation (X axis local)
    const pitchDelta = this.inputPitch * this.pitchRate * speedRatio * delta;

    // Yaw rotation (Y axis local) - Coordinated turn auto-yaw when banked
    const currentEuler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
    const autoYawFromBank = -Math.sin(currentEuler.z) * 0.4 * speedRatio;
    const yawDelta = (this.inputYaw * this.yawRate * speedRatio + autoYawFromBank) * delta;

    // 3. Apply Local Rotations via Quaternion
    const localRotation = new THREE.Quaternion();
    const eulerDelta = new THREE.Euler(pitchDelta, yawDelta, rollDelta, 'YXZ');
    localRotation.setFromEuler(eulerDelta);

    this.quaternion.multiply(localRotation);
    this.quaternion.normalize();

    // 4. Movement Physics (Forward Vector * Speed)
    // Airplane local forward is +Z in Three.js model orientation
    const moveDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);

    // Gravity / Lift calculations
    const lift = Math.pow(this.speed, 1.2) * this.liftFactor;
    const netVerticalForce = lift - this.gravity;
    moveDirection.y += (netVerticalForce * delta) / this.speed;

    // Move Airplane
    const step = moveDirection.clone().multiplyScalar(this.speed * delta);
    this.position.add(step);

    // Enforce minimum ground height (sea level at Y = 5)
    if (this.position.y < 5) {
      this.position.y = 5;
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
    let angle = Math.atan2(forward.x, forward.z) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return Math.round(angle);
  }

  getHeadingCardinal() {
    const deg = this.getHeadingDegrees();
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  }
}
