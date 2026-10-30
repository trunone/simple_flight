import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class TerrainManager {
  constructor(scene, chunkSize = 300, chunkResolution = 30, viewDistanceChunks = 3) {
    this.scene = scene;
    this.chunkSize = chunkSize; // Size of each terrain tile in world units
    this.chunkResolution = chunkResolution; // Grid segments per chunk
    this.viewDistance = viewDistanceChunks; // Render radius in chunks

    this.noise2D = createNoise2D();

    this.chunks = new Map(); // Key: "x,z" -> Chunk object

    // Shared Materials for Low-poly / Flat-shaded Terrain
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e88e5,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.3,
      flatShading: true
    });

    // Reusable geometries for instanced vegetation
    this._initTreeGeometries();
  }

  _initTreeGeometries() {
    // Pine Tree Geometry
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2, 5);
    trunkGeo.translate(0, 1, 0);
    const foliageGeo = new THREE.ConeGeometry(2, 5, 5);
    foliageGeo.translate(0, 4.5, 0);

    this.treeTrunkGeo = trunkGeo;
    this.treeFoliageGeo = foliageGeo;

    this.trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9, flatShading: true });
    this.foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8, flatShading: true });
  }

  // Get procedural height at world (x, z)
  getElevation(x, z) {
    // Multi-octave Simplex Noise
    const scale1 = 0.0012;
    const scale2 = 0.0035;
    const scale3 = 0.01;

    let n1 = this.noise2D(x * scale1, z * scale1);
    let n2 = this.noise2D(x * scale2, z * scale2) * 0.5;
    let n3 = this.noise2D(x * scale3, z * scale3) * 0.25;

    let totalNoise = (n1 + n2 + n3) / 1.75; // Normalized approx -1 to 1

    // River carving noise
    const riverScale = 0.0008;
    const riverNoise = Math.abs(this.noise2D(x * riverScale + 100, z * riverScale + 100));
    const riverBed = THREE.MathUtils.smoothstep(riverNoise, 0.0, 0.08); // 0 at river center

    // Height calculation
    let height = Math.pow(Math.max(0, totalNoise + 0.3), 2.2) * 120;

    // Apply river depth reduction
    height *= (0.2 + 0.8 * riverBed);

    return height;
  }

  // Get terrain vertex color based on height and slope
  _getBiomeColor(height, nx, ny, nz) {
    const slope = 1.0 - ny; // 0 for flat, up to 1 for vertical cliff
    const waterLevel = 8.0;

    const color = new THREE.Color();

    if (height < waterLevel) {
      // Sand / Shoreline
      color.setHex(0xe0c394);
    } else if (slope > 0.45) {
      // Steep Cliff / Rock
      color.setHex(0x757575);
    } else if (height < 35) {
      // Grass / Valley
      color.setHex(0x4cae51);
    } else if (height < 70) {
      // Highland Grass / Dark Green
      color.setHex(0x388e3c);
    } else if (height < 95) {
      // Mountain Rock / Tundra
      color.setHex(0x616161);
    } else {
      // Snow Cap Peak
      color.setHex(0xf5f5f5);
    }

    return color;
  }

  update(playerPos) {
    const currentChunkX = Math.floor((playerPos.x + this.chunkSize / 2) / this.chunkSize);
    const currentChunkZ = Math.floor((playerPos.z + this.chunkSize / 2) / this.chunkSize);

    const activeKeys = new Set();

    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dz = -this.viewDistance; dz <= this.viewDistance; dz++) {
        const chunkX = currentChunkX + dx;
        const chunkZ = currentChunkZ + dz;
        const key = `${chunkX},${chunkZ}`;
        activeKeys.add(key);

        if (!this.chunks.has(key)) {
          const chunkMesh = this._createChunk(chunkX, chunkZ);
          this.chunks.set(key, chunkMesh);
          this.scene.add(chunkMesh.group);
        }
      }
    }

    // Remove distant chunks outside view distance
    for (const [key, chunk] of this.chunks.entries()) {
      if (!activeKeys.has(key)) {
        this.scene.remove(chunk.group);
        chunk.group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
        });
        this.chunks.delete(key);
      }
    }
  }

  _createChunk(chunkX, chunkZ) {
    const group = new THREE.Group();
    const startX = chunkX * this.chunkSize;
    const startZ = chunkZ * this.chunkSize;

    const geo = new THREE.PlaneGeometry(
      this.chunkSize,
      this.chunkSize,
      this.chunkResolution,
      this.chunkResolution
    );
    geo.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const posAttr = geo.attributes.position;
    const vertexCount = posAttr.count;

    const colors = new Float32Array(vertexCount * 3);
    const treePositions = [];

    // Calculate vertex heights & positions
    for (let i = 0; i < vertexCount; i++) {
      const vx = posAttr.getX(i) + startX;
      const vz = posAttr.getZ(i) + startZ;
      const vy = this.getElevation(vx, vz);

      posAttr.setY(i, vy);

      // Estimate normal / slope for biome coloring
      const sampleDist = 2.0;
      const hL = this.getElevation(vx - sampleDist, vz);
      const hR = this.getElevation(vx + sampleDist, vz);
      const hD = this.getElevation(vx, vz - sampleDist);
      const hU = this.getElevation(vx, vz + sampleDist);

      const normal = new THREE.Vector3(hL - hR, 2.0 * sampleDist, hD - hU).normalize();
      const biomeColor = this._getBiomeColor(vy, normal.x, normal.y, normal.z);

      colors[i * 3] = biomeColor.r;
      colors[i * 3 + 1] = biomeColor.g;
      colors[i * 3 + 2] = biomeColor.b;

      // Randomly spawn trees on suitable grassy terrain
      if (vy > 10 && vy < 60 && normal.y > 0.85) {
        // Pseudo-random deterministic placement per chunk
        const treeNoise = this.noise2D(vx * 0.05, vz * 0.05);
        if (treeNoise > 0.45 && Math.random() < 0.15) {
          treePositions.push(new THREE.Vector3(posAttr.getX(i), vy, posAttr.getZ(i)));
        }
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(geo, this.terrainMaterial);
    terrainMesh.position.set(startX, 0, startZ);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    group.add(terrainMesh);

    // Ocean / Water Plane per chunk
    const waterGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
    waterMesh.position.set(startX, 7.5, startZ); // Water height level = 7.5
    group.add(waterMesh);

    // Instanced Trees for chunk performance
    if (treePositions.length > 0) {
      const trunkInstances = new THREE.InstancedMesh(this.treeTrunkGeo, this.trunkMaterial, treePositions.length);
      const foliageInstances = new THREE.InstancedMesh(this.treeFoliageGeo, this.foliageMaterial, treePositions.length);

      const dummy = new THREE.Object3D();

      treePositions.forEach((pos, idx) => {
        const scale = 0.7 + Math.random() * 0.6;
        dummy.position.set(pos.x + startX, pos.y, pos.z + startZ);
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.updateMatrix();

        trunkInstances.setMatrixAt(idx, dummy.matrix);
        foliageInstances.setMatrixAt(idx, dummy.matrix);
      });

      trunkInstances.castShadow = true;
      foliageInstances.castShadow = true;

      group.add(trunkInstances);
      group.add(foliageInstances);
    }

    return { group };
  }
}
