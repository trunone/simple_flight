export class ControlsManager {
  constructor(weatherManager, onWeatherChanged) {
    this.weatherManager = weatherManager;
    this.onWeatherChanged = onWeatherChanged;

    // Control values (-1 to 1)
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.throttleDelta = 0;
    this.targetThrottle = 0.5;

    // State
    this.keys = {};
    this.cameraModeToggleTriggered = false;

    // Touch / Joystick state
    this.touchJoystickActive = false;
    this.joystickTouchId = null;
    this.joystickCenter = { x: 0, y: 0 };

    this.touchThrottleActive = false;
    this.throttleTouchId = null;

    this._setupKeyboardListeners();
    this._setupTouchListeners();
  }

  _setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyR' && !e.repeat) {
        const newWeather = this.weatherManager.cycleNextWeather();
        if (this.onWeatherChanged) this.onWeatherChanged(newWeather);
      }

      if (e.code === 'KeyC' && !e.repeat) {
        this.cameraModeToggleTriggered = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  _setupTouchListeners() {
    const joystickZone = document.getElementById('mobile-joystick-zone');
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');

    const throttleZone = document.getElementById('mobile-throttle-zone');
    const throttleTrack = document.getElementById('throttle-track');
    const throttleHandle = document.getElementById('throttle-handle');

    if (!joystickZone || !throttleZone) return;

    // Joystick Touch Start
    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (!this.touchJoystickActive) {
          this.touchJoystickActive = true;
          this.joystickTouchId = touch.identifier;

          const rect = joystickBase.getBoundingClientRect();
          this.joystickCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          this._updateJoystickPos(touch.clientX, touch.clientY, joystickBase, joystickStick);
        }
      }
    }, { passive: false });

    // Joystick Touch Move
    window.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.touchJoystickActive && touch.identifier === this.joystickTouchId) {
          this._updateJoystickPos(touch.clientX, touch.clientY, joystickBase, joystickStick);
        }
        if (this.touchThrottleActive && touch.identifier === this.throttleTouchId) {
          this._updateThrottlePos(touch.clientY, throttleTrack, throttleHandle);
        }
      }
    }, { passive: false });

    // Touch End / Cancel
    const handleTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this.touchJoystickActive = false;
          this.joystickTouchId = null;
          this.pitch = 0;
          this.roll = 0;
          if (joystickStick) joystickStick.style.transform = 'translate(0px, 0px)';
        }
        if (touch.identifier === this.throttleTouchId) {
          this.touchThrottleActive = false;
          this.throttleTouchId = null;
        }
      }
    };

    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    // Throttle Touch Start
    throttleZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (!this.touchThrottleActive) {
          this.touchThrottleActive = true;
          this.throttleTouchId = touch.identifier;
          this._updateThrottlePos(touch.clientY, throttleTrack, throttleHandle);
        }
      }
    }, { passive: false });
  }

  _updateJoystickPos(clientX, clientY, joystickBase, joystickStick) {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const maxRadius = 45;

    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    if (joystickStick) {
      joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
    }

    // Map Joystick to Roll & Pitch
    this.roll = stickX / maxRadius;  // Left (-1) / Right (+1)
    this.pitch = stickY / maxRadius; // Up (+1 pitch down) / Down (-1 pitch up)
  }

  _updateThrottlePos(clientY, throttleTrack, throttleHandle) {
    if (!throttleTrack || !throttleHandle) return;
    const rect = throttleTrack.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const clampedY = Math.max(0, Math.min(rect.height, relativeY));

    // Throttle 1.0 at top (Y=0), 0.0 at bottom (Y=rect.height)
    const throttleVal = 1.0 - (clampedY / rect.height);
    this.targetThrottle = throttleVal;

    const handleHeight = 36;
    const maxBottom = rect.height - handleHeight / 2;
    const handleY = (1.0 - throttleVal) * rect.height - (handleHeight / 2);
    throttleHandle.style.bottom = `${Math.max(0, Math.min(rect.height - 36, rect.height - handleY - 36))}px`;
  }

  update(physics, delta) {
    // Desktop Keyboard overrides / updates
    let kPitch = 0;
    let kRoll = 0;
    let kYaw = 0;
    let kThrottleDelta = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) kPitch += 1.0;   // Pitch down
    if (this.keys['KeyS'] || this.keys['ArrowDown']) kPitch -= 1.0; // Pitch up

    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kRoll -= 1.0;  // Roll left
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kRoll += 1.0; // Roll right

    if (this.keys['KeyQ']) kYaw -= 1.0; // Yaw left
    if (this.keys['KeyE']) kYaw += 1.0; // Yaw right

    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) kThrottleDelta += 0.5 * delta;
    if (this.keys['ControlLeft'] || this.keys['ControlRight']) kThrottleDelta -= 0.5 * delta;

    // Combine Joystick touch + Keyboard input
    const finalPitch = this.touchJoystickActive ? this.pitch : kPitch;
    const finalRoll = this.touchJoystickActive ? this.roll : kRoll;
    const finalYaw = kYaw;

    if (this.touchThrottleActive) {
      physics.setThrottle(this.targetThrottle);
    } else {
      physics.setInputs(finalPitch, finalRoll, finalYaw, kThrottleDelta);
    }
  }

  checkCameraModeToggle() {
    if (this.cameraModeToggleTriggered) {
      this.cameraModeToggleTriggered = false;
      return true;
    }
    return false;
  }
}
