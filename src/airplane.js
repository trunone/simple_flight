import * as THREE from 'three';

export class Airplane {
  constructor() {
    this.mesh = new THREE.Group();
    this.propellerMesh = null;
    this.propellerBlurMesh = null;
    this.smokeParticles = [];
    this.smokeTimer = 0;

    this._buildAirplaneModel();
  }

  _buildAirplaneModel() {
    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe63946, // Vibrant Red
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true
    });

    const bodyAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf1faee, // Off White
      roughness: 0.3,
      flatShading: true
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1d3557, // Deep Blue/Black
      roughness: 0.5,
      flatShading: true
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa8dadc,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.1
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x8d99ae,
      metalness: 0.8,
      roughness: 0.2
    });

    const propMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d42,
      roughness: 0.4
    });

    const yellowTipMat = new THREE.MeshBasicMaterial({
      color: 0xffb703
    });

    // 1. Fuselage Main Body
    const fuselageGeo = new THREE.ConeGeometry(0.7, 4.2, 8);
    fuselageGeo.rotateX(-Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    this.mesh.add(fuselage);

    // Engine Cowl Nose
    const cowlGeo = new THREE.CylinderGeometry(0.7, 0.65, 0.8, 12);
    cowlGeo.rotateX(Math.PI / 2);
    const cowl = new THREE.Mesh(cowlGeo, darkMat);
    cowl.position.set(0, 0, 2.3);
    cowl.castShadow = true;
    this.mesh.add(cowl);

    // Decorative Body Stripes
    const stripeGeo = new THREE.BoxGeometry(1.42, 0.1, 2.5);
    const stripe = new THREE.Mesh(stripeGeo, bodyAccentMat);
    stripe.position.set(0, 0, 0.2);
    this.mesh.add(stripe);

    // Cockpit & Glass Canopy
    const cockpitGeo = new THREE.SphereGeometry(0.55, 12, 12);
    cockpitGeo.scale(0.8, 0.8, 1.8);
    const canopy = new THREE.Mesh(cockpitGeo, glassMat);
    canopy.position.set(0, 0.3, 0.2);
    this.mesh.add(canopy);

    // Pilot Head
    const pilotHeadGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const pilotHead = new THREE.Mesh(pilotHeadGeo, darkMat);
    pilotHead.position.set(0, 0.32, 0.1);
    this.mesh.add(pilotHead);

    // Helmet / Goggles
    const goggleGeo = new THREE.BoxGeometry(0.24, 0.08, 0.1);
    const goggle = new THREE.Mesh(goggleGeo, yellowTipMat);
    goggle.position.set(0, 0.35, 0.2);
    this.mesh.add(goggle);

    // 2. Wings (symmetrical from left tip -3.2 to right tip +3.2)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.5, 3.2);
    wingShape.lineTo(0.8, 0);
    wingShape.lineTo(0.5, -3.2);
    wingShape.lineTo(-0.5, -3.2);
    wingShape.lineTo(-0.8, 0);
    wingShape.lineTo(-0.5, 3.2);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(Math.PI / 2);
    wingGeo.rotateY(Math.PI / 2);

    const mainWing = new THREE.Mesh(wingGeo, bodyMat);
    mainWing.position.set(0, 0.05, 0.5);
    mainWing.castShadow = true;
    mainWing.receiveShadow = true;
    this.mesh.add(mainWing);

    // Wing Tips / Winglets
    [-3.2, 3.2].forEach(x => {
      const tipGeo = new THREE.BoxGeometry(0.1, 0.3, 0.6);
      const tip = new THREE.Mesh(tipGeo, bodyAccentMat);
      tip.position.set(x, 0.1, 0.5);
      this.mesh.add(tip);
    });

    // 3. Tail Assembly (Vertical Stabilizer & Elevator)
    const tailFinGeo = new THREE.BoxGeometry(0.1, 0.9, 0.8);
    const tailFin = new THREE.Mesh(tailFinGeo, bodyMat);
    tailFin.position.set(0, 0.6, -1.8);
    tailFin.rotation.x = -0.3;
    tailFin.castShadow = true;
    this.mesh.add(tailFin);

    const rudderGeo = new THREE.BoxGeometry(0.08, 0.85, 0.4);
    const rudder = new THREE.Mesh(rudderGeo, bodyAccentMat);
    rudder.position.set(0, 0.65, -2.15);
    rudder.rotation.x = -0.3;
    this.mesh.add(rudder);

    const tailPlaneGeo = new THREE.BoxGeometry(2.0, 0.06, 0.6);
    const tailPlane = new THREE.Mesh(tailPlaneGeo, bodyMat);
    tailPlane.position.set(0, 0.15, -1.8);
    tailPlane.castShadow = true;
    this.mesh.add(tailPlane);

    // 4. Propeller Assembly
    this.propellerMesh = new THREE.Group();
    this.propellerMesh.position.set(0, 0, 2.72);

    const propCapGeo = new THREE.ConeGeometry(0.25, 0.4, 12);
    propCapGeo.rotateX(Math.PI / 2);
    const propCap = new THREE.Mesh(propCapGeo, metalMat);
    this.propellerMesh.add(propCap);

    const bladeGeo = new THREE.BoxGeometry(1.6, 0.12, 0.03);
    const blade1 = new THREE.Mesh(bladeGeo, propMat);
    this.propellerMesh.add(blade1);

    const blade2 = new THREE.Mesh(bladeGeo, propMat);
    blade2.rotation.z = Math.PI / 2;
    this.propellerMesh.add(blade2);

    // Blade Tips
    [-0.75, 0.75].forEach(x => {
      const yellowTip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.035), yellowTipMat);
      yellowTip.position.x = x;
      blade1.add(yellowTip);

      const yellowTip2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.035), yellowTipMat);
      yellowTip2.position.x = x;
      blade2.add(yellowTip2);
    });

    this.mesh.add(this.propellerMesh);

    // Propeller Motion Blur Disc (visible at high RPM)
    const blurGeo = new THREE.CircleGeometry(0.8, 16);
    const blurMat = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    this.propellerBlurMesh = new THREE.Mesh(blurGeo, blurMat);
    this.propellerBlurMesh.position.set(0, 0, 2.73);
    this.mesh.add(this.propellerBlurMesh);

    // 5. Exhaust Pipes & Particle Anchors
    this.exhausts = [];
    [-0.35, 0.35].forEach(x => {
      const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8);
      exhaustGeo.rotateX(Math.PI / 3);
      const exhaust = new THREE.Mesh(exhaustGeo, metalMat);
      exhaust.position.set(x, -0.2, 2.0);
      this.mesh.add(exhaust);
      this.exhausts.push(exhaust);
    });

    // Wheels / Landing Gear
    [-0.6, 0.6].forEach(x => {
      const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
      const strut = new THREE.Mesh(strutGeo, metalMat);
      strut.position.set(x, -0.45, 0.7);
      strut.rotation.z = x > 0 ? -0.2 : 0.2;
      this.mesh.add(strut);

      const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.position.set(x * 1.1, -0.7, 0.7);
      this.mesh.add(wheel);
    });
  }

  update(delta, engineThrottle, currentSpeed) {
    // Spin propeller based on throttle / speed
    const rpm = 10 + engineThrottle * 40;
    if (this.propellerMesh) {
      this.propellerMesh.rotation.z += rpm * delta;
    }

    if (this.propellerBlurMesh) {
      this.propellerBlurMesh.material.opacity = Math.min(0.4, engineThrottle * 0.4);
    }
  }
}
