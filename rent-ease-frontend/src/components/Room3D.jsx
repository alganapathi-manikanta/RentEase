import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { matchRoomsToFloorPlan, analyzeFloorPlanFile } from '../utils/floorPlanAnalyzer';
import { buildCanonicalLayout, validateCanonicalLayout } from '../utils/canonicalLayout';
import { isPlotOrLandType } from '../utils/propertyFormHelpers';
import { FiAlertTriangle, FiRefreshCw, FiFileText, FiExternalLink, FiDownload } from 'react-icons/fi';
import { resolveMediaUrl } from '../utils/media';

export const ROOM_PALETTES = {
  living: {
    label: 'Living Room',
    floorColor: '#d4a373',
    floorType: 'wood',
    accent: '#2563eb',
    icon: '🛋️',
    defaultL: 18,
    defaultW: 14,
    defaultH: 10,
  },
  bedroom: {
    label: 'Bedroom',
    floorColor: '#e0c9a6',
    floorType: 'lightWood',
    accent: '#3b82f6',
    icon: '🛏️',
    defaultL: 14,
    defaultW: 12,
    defaultH: 10,
  },
  kitchen: {
    label: 'Kitchen',
    floorColor: '#f1f5f9',
    floorType: 'tile',
    accent: '#f97316',
    icon: '🍳',
    defaultL: 12,
    defaultW: 10,
    defaultH: 10,
  },
  dining: {
    label: 'Dining Room',
    floorColor: '#c79d6e',
    floorType: 'wood',
    accent: '#10b981',
    icon: '🍽️',
    defaultL: 12,
    defaultW: 10,
    defaultH: 10,
  },
  bathroom: {
    label: 'Bathroom',
    floorColor: '#e2e8f0',
    floorType: 'bathTile',
    accent: '#06b6d4',
    icon: '🚿',
    defaultL: 8,
    defaultW: 6,
    defaultH: 9,
  },
  utility: {
    label: 'Utility Area',
    floorColor: '#e2e8f0',
    floorType: 'bathTile',
    accent: '#0284c7',
    icon: '🧺',
    defaultL: 8,
    defaultW: 6,
    defaultH: 9,
  },
  balcony: {
    label: 'Balcony',
    floorColor: '#94a3b8',
    floorType: 'decking',
    accent: '#84cc16',
    icon: '🌿',
    defaultL: 10,
    defaultW: 5,
    defaultH: 10,
  },
  garage: {
    label: 'Parking',
    floorColor: '#334155',
    floorType: 'parking',
    accent: '#64748b',
    icon: '🚗',
    defaultL: 16,
    defaultW: 10,
    defaultH: 10,
  },
  study: {
    label: 'Study',
    floorColor: '#dfcfb9',
    floorType: 'lightWood',
    accent: '#8b5cf6',
    icon: '📚',
    defaultL: 12,
    defaultW: 10,
    defaultH: 10,
  },
  staircase: {
    label: 'Staircase',
    floorColor: '#94a3b8',
    floorType: 'wood',
    accent: '#64748b',
    icon: '🪜',
    defaultL: 10,
    defaultW: 8,
    defaultH: 10,
  },
  other: {
    label: 'Room',
    floorColor: '#e2e8f0',
    floorType: 'tile',
    accent: '#64748b',
    icon: '🏠',
    defaultL: 12,
    defaultW: 10,
    defaultH: 10,
  },
  land: {
    label: 'Plot Area',
    floorColor: '#b7c99b',
    floorType: 'grass',
    accent: '#4d7c0f',
    icon: '📐',
    defaultL: 40,
    defaultW: 30,
    defaultH: 0,
  },
  plot: {
    label: 'Plot Area',
    floorColor: '#b7c99b',
    floorType: 'grass',
    accent: '#4d7c0f',
    icon: '📐',
    defaultL: 40,
    defaultW: 30,
    defaultH: 0,
  },
};

export function classifyRoomType(name = '', fallbackType = 'other') {
  const str = `${name} ${fallbackType}`.toLowerCase();
  if (str.includes('land') || str.includes('plot')) return 'land';
  if (str.includes('living') || str.includes('hall') || str.includes('drawing') || str.includes('lounge') || str.includes('family')) return 'living';
  if (str.includes('kitch')) return 'kitchen';
  if (str.includes('din')) return 'dining';
  if (str.includes('bed') || str.includes('master')) return 'bedroom';
  if (str.includes('bath') || str.includes('toilet') || str.includes('wc') || str.includes('powder')) return 'bathroom';
  if (str.includes('utility') || str.includes('laundry') || str.includes('wash area') || str.includes('wash') || str.includes('pantry') || str.includes('store')) return 'utility';
  if (str.includes('balcon') || str.includes('terrace') || str.includes('deck') || str.includes('patio')) return 'balcony';
  if (str.includes('park') || str.includes('garage') || str.includes('car')) return 'garage';
  if (str.includes('study') || str.includes('office') || str.includes('work')) return 'study';
  if (str.includes('stair') || str.includes('step') || str.includes('lift')) return 'staircase';
  return 'other';
}

const toMeters = (val, unit = 'ft') => {
  const num = Number(val);
  const factor = unit === 'm' ? 1.0 : 0.3048;
  return Number.isFinite(num) && num > 0 ? num * factor : 0;
};

// Procedural texture generators for realistic floor visuals
function createFloorTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (type === 'wood' || type === 'lightWood') {
    const isLight = type === 'lightWood';
    ctx.fillStyle = isLight ? '#e7d8c4' : '#c99a6b';
    ctx.fillRect(0, 0, 512, 512);

    const plankH = 32;
    const plankW = 128;
    ctx.strokeStyle = isLight ? '#d2bc9f' : '#b28052';
    ctx.lineWidth = 1.5;

    for (let y = 0; y < 512; y += plankH) {
      const offsetX = (y / plankH) % 2 === 0 ? 0 : plankW / 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      for (let x = -plankW; x < 512 + plankW; x += plankW) {
        ctx.beginPath();
        ctx.moveTo(x + offsetX, y);
        ctx.lineTo(x + offsetX, y + plankH);
        ctx.stroke();

        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(x + offsetX + 2, y + 2, plankW - 4, plankH - 4);
      }
    }
  } else if (type === 'tile') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;

    const tileSize = 64;
    for (let i = 0; i <= 512; i += tileSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
  } else if (type === 'bathTile') {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;

    const tileSize = 32;
    for (let i = 0; i <= 512; i += tileSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
  } else if (type === 'decking') {
    ctx.fillStyle = '#78716c';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 3;

    for (let y = 0; y <= 512; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  } else if (type === 'parking') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.setLineDash([20, 10]);

    ctx.strokeRect(40, 40, 432, 432);
    ctx.setLineDash([]);
  } else if (type === 'grass' || type === 'land' || type === 'plot') {
    ctx.fillStyle = '#b7c99b';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#a4b787';
    ctx.lineWidth = 1.5;
    const gridStep = 32;
    for (let i = 0; i <= 512; i += gridStep) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(141, 163, 110, 0.25)';
    for (let i = 0; i < 60; i++) {
      const rx = (i * 37) % 500;
      const ry = (i * 59) % 500;
      ctx.fillRect(rx, ry, 12, 12);
    }
  } else {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 512, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Disambiguate duplicate names and ensure clean, non-duplicate sequential labels
function disambiguateRoomNames(rooms) {
  if (!rooms || !rooms.length) return [];

  const typeBuckets = {};
  rooms.forEach((r) => {
    if (!typeBuckets[r.type]) typeBuckets[r.type] = [];
    typeBuckets[r.type].push(r);
  });

  const usedFinalNames = new Set();
  const result = [];

  rooms.forEach((r) => {
    const pal = ROOM_PALETTES[r.type] || ROOM_PALETTES.other;
    const bucket = typeBuckets[r.type] || [r];
    const totalOfType = bucket.length;
    const indexInType = bucket.indexOf(r) + 1;

    let rawName = (r.name || '').trim();

    const isGeneric =
      !rawName ||
      rawName.toLowerCase() === 'room' ||
      rawName.toLowerCase() === r.type.toLowerCase() ||
      rawName.toLowerCase() === pal.label.toLowerCase();

    const hasTrailingNum = /\s+\d+$/.test(rawName);

    let cleanName = rawName;
    if (isGeneric || hasTrailingNum) {
      if (totalOfType > 1) {
        cleanName = `${pal.label} ${indexInType}`;
      } else {
        cleanName = pal.label;
      }
    } else {
      if (usedFinalNames.has(cleanName)) {
        cleanName = totalOfType > 1 ? `${pal.label} ${indexInType}` : `${cleanName} (${indexInType})`;
      }
    }

    usedFinalNames.add(cleanName);
    result.push({
      ...r,
      name: cleanName,
    });
  });

  return result;
}

function createRoomBadge(name, dimText, icon) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(8, 8, 496, 124, 24);
  } else {
    ctx.rect(8, 8, 496, 124);
  }
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${icon ? icon + ' ' : ''}${name}`, 256, 48);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 26px system-ui, -apple-system, sans-serif';
  ctx.fillText(dimText, 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);

  sprite.scale.set(3.2, 0.88, 1);
  sprite.userData.texture = texture;
  return sprite;
}

// Procedural 3D Furniture Builder with Furnishing Modes, Room-Proportional Scaling, Recognizable Realism & Strict Collision Avoidance
export function normalizeFurnishing(value) {
  if (value === undefined || value === null) return 'furnished';
  const s = String(value).trim().toLowerCase().replace(/[-_\s]+/g, '');
  if (!s) return 'furnished';
  if (s.includes('unfurnish') || s === 'none' || s === 'bare' || s === 'empty' || s === 'raw') {
    return 'unfurnished';
  }
  if (s.includes('semi') || s.includes('part') || s.includes('half')) {
    return 'semi-furnished';
  }
  if (s.includes('furnish') || s === 'full' || s === 'fully' || s === 'complete') {
    return 'furnished';
  }
  return 'furnished';
}

function addFurnitureToRoom(room, group, geometries, materials, furnishingMode = 'furnished', roomDoors = []) {
  const normMode = normalizeFurnishing(furnishingMode);
  // 1. UNFURNISHED: Show NO furniture inside rooms (walls, floors, openings & labels only)
  if (normMode === 'unfurnished') return;

  const { type, lM, wM } = room;
  const furnGroup = new THREE.Group();
  furnGroup.position.set(room.x, 0.03, room.z);

  // Usable interior span with safe clearance from walls (wall thickness = 0.16m, wallMargin = 0.14m)
  const wallMargin = 0.14;
  const minInnerX = -lM / 2 + wallMargin;
  const maxInnerX = lM / 2 - wallMargin;
  const minInnerZ = -wM / 2 + wallMargin;
  const maxInnerZ = wM / 2 - wallMargin;
  const uL = maxInnerX - minInnerX; // usable length along X
  const uW = maxInnerZ - minInnerZ; // usable width along Z

  if (uL < 0.8 || uW < 0.8) return; // Room too compact for interior furnishings

  const isSemi = normMode === 'semi-furnished';

  // Track 2D bounding boxes of placed furniture inside this room to guarantee ZERO collisions
  const placedBoxes = [];

  // Reserve doorway clearance zones so furniture NEVER blocks any door
  if (Array.isArray(roomDoors) && roomDoors.length > 0) {
    roomDoors.forEach((d) => {
      const relX = d.x - room.x;
      const relZ = d.z - room.z;
      const pad = 0.55;
      placedBoxes.push({
        minX: relX - (d.orientation === 'horizontal' ? d.width / 2 + 0.2 : pad),
        maxX: relX + (d.orientation === 'horizontal' ? d.width / 2 + 0.2 : pad),
        minZ: relZ - (d.orientation === 'vertical' ? d.width / 2 + 0.2 : pad),
        maxZ: relZ + (d.orientation === 'vertical' ? d.width / 2 + 0.2 : pad),
      });
    });
  }

  const createMesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    geometries.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    furnGroup.add(m);
    return m;
  };

  // High-fidelity architectural standard materials
  const matDarkWood = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.65 });
  const matWarmWood = new THREE.MeshStandardMaterial({ color: 0x935116, roughness: 0.6 });
  const matWhiteWood = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const matSofa = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.82 });
  const matCushion = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
  const matWhiteCeramic = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.35, roughness: 0.1 });
  const matMirror = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.05 });
  const matBedSheet = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
  const matBedDuvet = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 });
  const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.4 });
  const matTVScreen = new THREE.MeshStandardMaterial({ color: 0x050811, metalness: 0.3, roughness: 0.08 });
  const matPlant = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });
  const matCarBody = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6, roughness: 0.25 });
  const matCarTire = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const matRug = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.95 });

  materials.push(
    matDarkWood, matWarmWood, matWhiteWood, matSofa, matCushion, matWhiteCeramic,
    matChrome, matGlass, matMirror, matBedSheet, matBedDuvet, matDarkMetal,
    matTVScreen, matPlant, matCarBody, matCarTire, matRug
  );

  // Safe placement attempt with strict boundary clamping and collision avoidance
  const tryPlaceItem = (name, widthX, depthZ, idealX, idealZ, buildFn, allowDownsize = true) => {
    let w = widthX;
    let d = depthZ;

    // Check if initial size exceeds usable bounds
    if (w > uL) {
      if (!allowDownsize) return false;
      w = Math.max(0.6, uL - 0.1);
    }
    if (d > uW) {
      if (!allowDownsize) return false;
      d = Math.max(0.6, uW - 0.1);
    }

    // Clamp coordinates strictly within room interior boundaries
    let x = Math.max(minInnerX + w / 2, Math.min(maxInnerX - w / 2, idealX));
    let z = Math.max(minInnerZ + d / 2, Math.min(maxInnerZ - d / 2, idealZ));

    // Collision check against already placed items
    const checkCollision = (cx, cz, cw, cd) => {
      const bMinX = cx - cw / 2;
      const bMaxX = cx + cw / 2;
      const bMinZ = cz - cd / 2;
      const bMaxZ = cz + cd / 2;
      for (const box of placedBoxes) {
        const overlapX = Math.min(bMaxX, box.maxX) - Math.max(bMinX, box.minX);
        const overlapZ = Math.min(bMaxZ, box.maxZ) - Math.max(bMinZ, box.minZ);
        if (overlapX > 0.05 && overlapZ > 0.05) {
          return true; // overlaps with existing item
        }
      }
      return false;
    };

    if (checkCollision(x, z, w, d)) {
      // Try shifting along X or Z if possible
      let resolved = false;
      const shiftOffsets = [-0.4, 0.4, -0.8, 0.8, -1.2, 1.2, -1.8, 1.8, -2.4, 2.4];
      for (const sx of shiftOffsets) {
        const testX = Math.max(minInnerX + w / 2, Math.min(maxInnerX - w / 2, x + sx));
        if (!checkCollision(testX, z, w, d)) {
          x = testX;
          resolved = true;
          break;
        }
      }
      if (!resolved) {
        for (const sz of shiftOffsets) {
          const testZ = Math.max(minInnerZ + d / 2, Math.min(maxInnerZ - d / 2, z + sz));
          if (!checkCollision(x, testZ, w, d)) {
            z = testZ;
            resolved = true;
            break;
          }
        }
      }

      // If still colliding and downsizing is permitted, try 85% or 70%
      if (!resolved && allowDownsize) {
        for (const scale of [0.85, 0.70]) {
          const sw = w * scale;
          const sd = d * scale;
          if (sw >= 0.5 && sd >= 0.5) {
            const testX = Math.max(minInnerX + sw / 2, Math.min(maxInnerX - sw / 2, x));
            const testZ = Math.max(minInnerZ + sd / 2, Math.min(maxInnerZ - sd / 2, z));
            if (!checkCollision(testX, testZ, sw, sd)) {
              w = sw;
              d = sd;
              x = testX;
              z = testZ;
              resolved = true;
              break;
            }
          }
        }
      }

      if (!resolved) {
        // Cannot fit safely without overlap -> omit safely to maintain clear walking space
        return false;
      }
    }

    // Record footprint in placedBoxes
    placedBoxes.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      name,
    });

    // Invoke mesh builder
    buildFn(x, z, w, d);
    return true;
  };

  // ROOM TYPE 1: BEDROOM
  if (type === 'bedroom') {
    const isSmall = uL < 3.4 || uW < 3.2;
    const isLarge = uL >= 4.8 && uW >= 3.8;

    // 1. Bed: Automatically scales to room length & width with substantial 3D presence
    const bedW = isSmall
      ? Math.max(1.50, Math.min(uL * 0.58, uL - 0.90))
      : isLarge
      ? Math.max(2.40, Math.min(uL * 0.56, uL - 1.40, 4.20))
      : Math.max(1.90, Math.min(uL * 0.58, uL - 1.10));
    const bedL = isSmall
      ? Math.max(1.95, Math.min(uW * 0.62, uW - 0.70))
      : isLarge
      ? Math.max(2.40, Math.min(uW * 0.62, uW - 1.20, 3.60))
      : Math.max(2.15, Math.min(uW * 0.60, uW - 0.90));
    const bedZ = minInnerZ + bedL / 2 + 0.08;

    tryPlaceItem('Bed', bedW, bedL, 0, bedZ, (bx, bz, bw, bl) => {
      // Raised wooden bed base/frame with depth
      createMesh(new THREE.BoxGeometry(bw + 0.10, 0.35, bl + 0.10), matDarkWood, bx, 0.175, bz);
      // Tall, elegant headboard with real 3D depth (clearly visible from camera)
      const headH = 1.35;
      const headDepth = 0.20;
      createMesh(new THREE.BoxGeometry(bw + 0.14, headH, headDepth), matDarkWood, bx, headH / 2, bz - bl / 2 - headDepth / 2 + 0.02);
      // Thick, premium mattress
      createMesh(new THREE.BoxGeometry(bw, 0.32, bl), matBedSheet, bx, 0.51, bz);
      // Royal blue duvet / folded bedspread across lower 68% of bed
      const duvetL = bl * 0.68;
      createMesh(new THREE.BoxGeometry(bw * 0.96, 0.10, duvetL), matBedDuvet, bx, 0.69, bz + bl * 0.14);
      // Fluffy angled pillows
      const pillowW = Math.min(bw * 0.40, 0.75);
      const pillowL = 0.48;
      createMesh(new THREE.BoxGeometry(pillowW, 0.16, pillowL), matBedSheet, bx - bw * 0.26, 0.68, bz - bl * 0.30, -0.25);
      createMesh(new THREE.BoxGeometry(pillowW, 0.16, pillowL), matBedSheet, bx + bw * 0.26, 0.68, bz - bl * 0.30, -0.25);
      if (isLarge) {
        // King bed: add second tier of decorative cushions
        createMesh(new THREE.BoxGeometry(pillowW * 0.82, 0.14, pillowL * 0.75), matCushion, bx - bw * 0.26, 0.74, bz - bl * 0.18, -0.2);
        createMesh(new THREE.BoxGeometry(pillowW * 0.82, 0.14, pillowL * 0.75), matCushion, bx + bw * 0.26, 0.74, bz - bl * 0.18, -0.2);
      }
    }, false);

    // 2. Wardrobe Closet: Substantial height (2.05m tall), wide panels & metallic handles
    const wardW = isSemi || isSmall
      ? Math.max(1.10, Math.min(uL * 0.38, 1.60))
      : isLarge
      ? Math.max(2.20, Math.min(uL * 0.44, uL - 1.60, 3.80))
      : Math.max(1.50, Math.min(uL * 0.40, 2.40));
    const wardD = Math.max(0.60, Math.min(uW * 0.18, 0.95));
    const wardH = 2.05;
    const wardZ = maxInnerZ - wardD / 2;
    const wardX = maxInnerX - wardW / 2;

    tryPlaceItem('Wardrobe', wardW, wardD, wardX, wardZ, (wx, wz, ww, wd) => {
      // Main wardrobe body
      createMesh(new THREE.BoxGeometry(ww, wardH, wd), matWarmWood, wx, wardH / 2, wz);
      // Vertical door seam line
      createMesh(new THREE.BoxGeometry(0.02, wardH * 0.94, 0.02), matDarkMetal, wx, wardH / 2, wz - wd / 2 - 0.01);
      // Chrome door handles
      createMesh(new THREE.BoxGeometry(0.035, 0.30, 0.035), matChrome, wx - 0.10, 1.10, wz - wd / 2 - 0.02);
      createMesh(new THREE.BoxGeometry(0.035, 0.30, 0.035), matChrome, wx + 0.10, 1.10, wz - wd / 2 - 0.02);
      // Top crown moulding
      createMesh(new THREE.BoxGeometry(ww + 0.05, 0.08, wd + 0.05), matDarkWood, wx, wardH + 0.04, wz);
    }, true);

    // 3. Nightstands & Lamps (FURNISHED only, omitted in Semi-Furnished)
    if (!isSemi) {
      const sideClearance = (uL - bedW) / 2;
      const standW = Math.max(0.50, Math.min(sideClearance * 0.65, 0.90));
      const standD = Math.max(0.45, Math.min(bedL * 0.25, 0.70));
      const standH = 0.65;
      const standZ = bedZ - bedL / 3;

      const buildStand = (sx, sz, sw, sd) => {
        createMesh(new THREE.BoxGeometry(sw, standH, sd), matWarmWood, sx, standH / 2, sz);
        createMesh(new THREE.BoxGeometry(sw * 0.7, 0.04, 0.02), matChrome, sx, standH * 0.65, sz + sd / 2 + 0.01);
        // Table lamp on top
        createMesh(new THREE.CylinderGeometry(0.10, 0.12, 0.15, 12), matWhiteCeramic, sx, standH + 0.075, sz);
        createMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), matChrome, sx, standH + 0.24, sz);
        createMesh(new THREE.CylinderGeometry(0.15, 0.20, 0.25, 14), matWhiteWood, sx, standH + 0.40, sz);
      };

      tryPlaceItem('Nightstand-L', standW, standD, -bedW / 2 - standW / 2 - 0.08, standZ, buildStand, true);
      tryPlaceItem('Nightstand-R', standW, standD, bedW / 2 + standW / 2 + 0.08, standZ, buildStand, true);

      // 4. Large Bedroom Extra: Vanity Dressing Table & Mirror (FURNISHED only)
      if (isLarge) {
        const vanityW = Math.max(1.30, Math.min(uL * 0.28, 2.20));
        const vanityD = Math.max(0.55, Math.min(uW * 0.15, 0.80));
        const vanityH = 0.82;
        const vanityX = minInnerX + vanityW / 2;
        const vanityZ = maxInnerZ - vanityD / 2;

        tryPlaceItem('VanityDresser', vanityW, vanityD, vanityX, vanityZ, (vx, vz, vw, vd) => {
          createMesh(new THREE.BoxGeometry(vw, vanityH, vd), matDarkWood, vx, vanityH / 2, vz);
          // Mirror above desk
          const mirrorH = 0.85;
          createMesh(new THREE.BoxGeometry(vw * 0.75, mirrorH, 0.03), matMirror, vx, vanityH + mirrorH / 2 + 0.08, vz + vd / 2 - 0.02);
          // Upholstered vanity stool
          createMesh(new THREE.BoxGeometry(0.45, 0.48, 0.45), matSofa, vx, 0.24, vz - vd / 2 - 0.28);
        }, true);
      }
    }
  }

  // ROOM TYPE 2: LIVING ROOM
  else if (type === 'living') {
    const isSmall = uL < 3.8 || uW < 3.2;
    const isLarge = uL >= 5.0 && uW >= 4.0;

    // 1. Sofa / Sectional: Scales properly with cushions, backrest, armrests & throw pillows
    const sofaW = isSmall
      ? Math.max(2.20, Math.min(uL * 0.65, uL - 1.10))
      : isLarge
      ? Math.max(3.40, Math.min(uL * 0.64, uL - 1.60, 6.50))
      : Math.max(2.70, Math.min(uL * 0.64, uL - 1.30));
    const sofaD = isSmall ? 0.90 : Math.max(1.00, Math.min(uW * 0.24, 1.50));
    const sofaH = 0.98;
    const sofaZ = maxInnerZ - sofaD / 2 - 0.08;

    tryPlaceItem('Sofa', sofaW, sofaD, 0, sofaZ, (sx, sz, sw, sd) => {
      // Base plinth
      createMesh(new THREE.BoxGeometry(sw, 0.12, sd), matDarkWood, sx, 0.06, sz);
      // Deep seat cushions (seat height = 0.50m)
      createMesh(new THREE.BoxGeometry(sw, 0.38, sd), matSofa, sx, 0.31, sz);
      // Backrest cushions (height = 0.98m)
      createMesh(new THREE.BoxGeometry(sw, 0.58, 0.26), matSofa, sx, 0.69, sz + sd / 2 - 0.13);
      // Padded armrests
      const armW = Math.min(0.24, sw * 0.10);
      createMesh(new THREE.BoxGeometry(armW, 0.48, sd), matSofa, sx - sw / 2 + armW / 2, 0.44, sz);
      createMesh(new THREE.BoxGeometry(armW, 0.48, sd), matSofa, sx + sw / 2 - armW / 2, 0.44, sz);
      // Vibrant accent throw pillows
      const cushionW = Math.min(0.48, sw * 0.16);
      createMesh(new THREE.BoxGeometry(cushionW, 0.36, 0.14), matCushion, sx - sw * 0.28, 0.54, sz + sd * 0.20, -0.2);
      createMesh(new THREE.BoxGeometry(cushionW, 0.36, 0.14), matCushion, sx + sw * 0.28, 0.54, sz + sd * 0.20, -0.2);

      // Large living room: add L-chaise lounge if depth allows
      if (isLarge && !isSemi && uW >= 4.2) {
        const chaiseL = Math.max(1.50, Math.min(uW * 0.38, 2.20));
        const chaiseW = Math.max(1.00, Math.min(sw * 0.30, 1.50));
        createMesh(new THREE.BoxGeometry(chaiseW, 0.38, chaiseL), matSofa, sx + sw / 2 - chaiseW / 2, 0.31, sz - sd / 2 - chaiseL / 2);
      }
    }, false);

    // 2. Center Coffee Table: Proportionally scaled to sofa
    const tableW = Math.max(1.20, Math.min(sofaW * 0.55, 3.20));
    const tableD = Math.max(0.65, Math.min(uW * 0.18, 1.20));
    const tableH = 0.48;
    const tableZ = sofaZ - sofaD / 2 - tableD / 2 - 0.45;

    tryPlaceItem('CoffeeTable', tableW, tableD, 0, tableZ, (tx, tz, tw, td) => {
      // Solid wood tabletop
      createMesh(new THREE.BoxGeometry(tw, 0.06, td), matWarmWood, tx, tableH - 0.03, tz);
      // 4 modern metal legs
      const legR = 0.035;
      const legH = tableH - 0.06;
      const legX = tw / 2 - 0.10;
      const legZ = td / 2 - 0.10;
      createMesh(new THREE.CylinderGeometry(legR, legR, legH), matDarkMetal, tx - legX, legH / 2, tz - legZ);
      createMesh(new THREE.CylinderGeometry(legR, legR, legH), matDarkMetal, tx + legX, legH / 2, tz - legZ);
      createMesh(new THREE.CylinderGeometry(legR, legR, legH), matDarkMetal, tx - legX, legH / 2, tz + legZ);
      createMesh(new THREE.CylinderGeometry(legR, legR, legH), matDarkMetal, tx + legX, legH / 2, tz + legZ);
    }, true);

    // 3. Area Rug (FURNISHED only)
    if (!isSemi) {
      const rugW = Math.min(sofaW + 0.80, uL - 0.2);
      const rugD = Math.min(tableD + sofaD + 0.80, uW * 0.60);
      const rugZ = (sofaZ + tableZ) / 2;
      createMesh(new THREE.BoxGeometry(rugW, 0.015, rugD), matRug, 0, 0.0075, rugZ);
    }

    // 4. TV Media Wall Unit & Television: Substantial credenza + widescreen flat panel
    const consoleW = isSmall
      ? Math.max(1.80, Math.min(uL * 0.50, uL - 1.20))
      : isLarge
      ? Math.max(3.00, Math.min(uL * 0.58, uL - 1.80, 5.80))
      : Math.max(2.20, Math.min(uL * 0.52, 3.40));
    const consoleD = Math.max(0.50, Math.min(uW * 0.14, 0.80));
    const consoleH = 0.60;
    const consoleZ = minInnerZ + consoleD / 2 + 0.06;

    tryPlaceItem('TVUnit', consoleW, consoleD, 0, consoleZ, (cx, cz, cw, cd) => {
      // Credenza cabinet
      createMesh(new THREE.BoxGeometry(cw, consoleH, cd), matDarkWood, cx, consoleH / 2, cz);
      // Flat-screen TV with realistic screen bezel and high-contrast panel
      const tvW = Math.max(1.60, Math.min(cw * 0.78, 4.20));
      const tvH = Math.max(0.95, tvW * 0.56);
      const tvY = consoleH + tvH / 2 + 0.10;
      // TV pedestal base & pole
      createMesh(new THREE.BoxGeometry(tvW * 0.35, 0.03, 0.26), matDarkMetal, cx, consoleH + 0.015, cz);
      createMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.10), matDarkMetal, cx, consoleH + 0.05, cz);
      // Outer TV frame
      createMesh(new THREE.BoxGeometry(tvW, tvH, 0.06), matDarkMetal, cx, tvY, cz);
      // Glossy black television display screen
      createMesh(new THREE.BoxGeometry(tvW * 0.94, tvH * 0.92, 0.02), matTVScreen, cx, tvY, cz + 0.03);
    }, true);

    // 5. Additional Seating & Potted Plant (FURNISHED only)
    if (!isSemi) {
      if (isLarge || (!isSmall && uL >= 4.5)) {
        const chairW = Math.max(0.85, Math.min(uL * 0.18, 1.20));
        const chairD = chairW;
        const chairX = minInnerX + chairW / 2 + 0.20;
        const chairZ = tableZ;
        tryPlaceItem('Armchair', chairW, chairD, chairX, chairZ, (ax, az, aw, ad) => {
          createMesh(new THREE.BoxGeometry(aw, 0.42, ad), matSofa, ax, 0.28, az, 0, Math.PI / 4, 0);
          createMesh(new THREE.BoxGeometry(aw, 0.52, 0.20), matSofa, ax - 0.10, 0.58, az - 0.10, 0, Math.PI / 4, 0);
        }, true);
      }

      // Decorative ceramic planter with lush green foliage
      const plantSize = Math.max(0.50, Math.min(uL * 0.10, 0.80));
      const plantX = maxInnerX - plantSize / 2 - 0.10;
      const plantZ = minInnerZ + plantSize / 2 + 0.10;
      tryPlaceItem('Plant', plantSize, plantSize, plantX, plantZ, (px, pz) => {
        createMesh(new THREE.CylinderGeometry(plantSize * 0.42, plantSize * 0.32, 0.52, 14), matWhiteCeramic, px, 0.26, pz);
        createMesh(new THREE.SphereGeometry(plantSize * 0.60, 10, 10), matPlant, px, 0.68, pz);
      }, true);
    }
  }

  // ROOM TYPE 3: KITCHEN
  else if (type === 'kitchen') {
    const isSmall = uL < 3.2 || uW < 2.8;
    const isLarge = uL >= 4.2 && uW >= 3.4;

    // 1. Refrigerator: Double-door with chrome handles, realistically scaled
    const fridgeW = Math.max(0.90, Math.min(uL * 0.20, 1.25));
    const fridgeD = Math.max(0.75, Math.min(uW * 0.22, 1.00));
    const fridgeH = 1.95;
    const fridgeX = maxInnerX - fridgeW / 2 - 0.04;
    const fridgeZ = minInnerZ + fridgeD / 2 + 0.04;

    tryPlaceItem('Fridge', fridgeW, fridgeD, fridgeX, fridgeZ, (fx, fz, fw, fd) => {
      createMesh(new THREE.BoxGeometry(fw, fridgeH, fd), matChrome, fx, fridgeH / 2, fz);
      createMesh(new THREE.BoxGeometry(0.02, fridgeH * 0.92, 0.02), matDarkMetal, fx, fridgeH / 2, fz + fd / 2 + 0.01);
      createMesh(new THREE.BoxGeometry(0.035, 0.36, 0.035), matDarkMetal, fx - 0.08, 1.10, fz + fd / 2 + 0.02);
      createMesh(new THREE.BoxGeometry(0.035, 0.36, 0.035), matDarkMetal, fx + 0.08, 1.10, fz + fd / 2 + 0.02);
    }, false);

    // 2. Kitchen Counter: Base cabinets, white quartz top, cooktop, sink & faucet
    const counterD = Math.max(0.75, Math.min(uW * 0.25, 1.05));
    const counterH = 0.92;
    const counterL = Math.max(1.80, uL - fridgeW - 0.25);
    const counterX = minInnerX + counterL / 2 + 0.04;
    const counterZ = minInnerZ + counterD / 2 + 0.04;

    tryPlaceItem('KitchenCounter', counterL, counterD, counterX, counterZ, (kx, kz, kl, kd) => {
      // Cabinet base
      createMesh(new THREE.BoxGeometry(kl, counterH, kd), matDarkWood, kx, counterH / 2, kz);
      // Quartz countertop
      createMesh(new THREE.BoxGeometry(kl + 0.06, 0.06, kd + 0.06), matWhiteCeramic, kx, counterH + 0.03, kz);
      // 4-burner induction cooktop
      const cookW = Math.max(0.75, Math.min(kl * 0.32, 1.05));
      createMesh(new THREE.BoxGeometry(cookW, 0.025, kd * 0.65), matDarkMetal, kx - kl * 0.24, counterH + 0.07, kz);
      // Undermount stainless steel sink
      const sinkW = Math.max(0.60, Math.min(kl * 0.28, 0.85));
      createMesh(new THREE.BoxGeometry(sinkW, 0.025, kd * 0.60), matChrome, kx + kl * 0.24, counterH + 0.07, kz);
      createMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.30, 8), matChrome, kx + kl * 0.24, counterH + 0.22, kz - kd * 0.20);

      // Upper wall cabinets (FURNISHED only)
      if (!isSemi) {
        const wallCabH = 0.65;
        const wallCabD = 0.42;
        createMesh(new THREE.BoxGeometry(kl, wallCabH, wallCabD), matWhiteWood, kx, 1.62, minInnerZ + wallCabD / 2 + 0.02);
      }
    }, false);

    // 3. Kitchen Island (FURNISHED + Large kitchen with sufficient width)
    if (!isSemi && isLarge && uW >= 3.6) {
      const islandW = Math.max(1.40, Math.min(uL * 0.42, 2.60));
      const islandD = Math.max(0.85, Math.min(uW * 0.28, 1.30));
      const islandH = 0.92;
      const islandZ = maxInnerZ - islandD / 2 - 0.35;

      tryPlaceItem('KitchenIsland', islandW, islandD, 0, islandZ, (ix, iz, iw, id) => {
        createMesh(new THREE.BoxGeometry(iw, islandH, id), matDarkWood, ix, islandH / 2, iz);
        createMesh(new THREE.BoxGeometry(iw + 0.08, 0.06, id + 0.08), matWhiteCeramic, ix, islandH + 0.03, iz);
        // Barstools
        createMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), matWarmWood, ix - iw * 0.25, 0.65, iz + id / 2 + 0.26);
        createMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8), matDarkMetal, ix - iw * 0.25, 0.31, iz + id / 2 + 0.26);
        createMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), matWarmWood, ix + iw * 0.25, 0.65, iz + id / 2 + 0.26);
        createMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8), matDarkMetal, ix + iw * 0.25, 0.31, iz + id / 2 + 0.26);
      }, true);
    }
  }

  // ROOM TYPE 4: BATHROOM
  else if (type === 'bathroom') {
    const isCompact = uL < 2.2 || uW < 2.0;

    // 1. Modern Toilet with cistern & flush button
    const toiletW = 0.48;
    const toiletD = 0.70;
    const toiletX = minInnerX + toiletW / 2 + 0.06;
    const toiletZ = minInnerZ + toiletD / 2 + 0.06;

    tryPlaceItem('Toilet', toiletW, toiletD, toiletX, toiletZ, (tx, tz, tw, td) => {
      // Toilet bowl
      createMesh(new THREE.BoxGeometry(tw, 0.46, td * 0.65), matWhiteCeramic, tx, 0.23, tz + td * 0.15);
      // Water cistern tank
      createMesh(new THREE.BoxGeometry(tw, 0.52, td * 0.35), matWhiteCeramic, tx, 0.62, tz - td * 0.30);
      // Chrome flush button
      createMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 10), matChrome, tx, 0.89, tz - td * 0.30);
    }, false);

    // 2. Wash Basin & Vanity with wall mirror
    const vanityW = isCompact ? Math.max(0.75, Math.min(uL * 0.42, 1.05)) : Math.max(0.95, Math.min(uL * 0.46, 1.60));
    const vanityD = Math.max(0.55, Math.min(uW * 0.26, 0.75));
    const vanityH = 0.86;
    const vanityX = maxInnerX - vanityW / 2 - 0.06;
    const vanityZ = minInnerZ + vanityD / 2 + 0.06;

    tryPlaceItem('Vanity', vanityW, vanityD, vanityX, vanityZ, (vx, vz, vw, vd) => {
      createMesh(new THREE.BoxGeometry(vw, vanityH, vd), matDarkWood, vx, vanityH / 2, vz);
      createMesh(new THREE.BoxGeometry(vw + 0.05, 0.06, vd + 0.05), matWhiteCeramic, vx, vanityH + 0.03, vz);
      createMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), matChrome, vx, vanityH + 0.14, vz - vd * 0.20);
      // Wall mirror
      createMesh(new THREE.BoxGeometry(vw * 0.82, 0.80, 0.02), matMirror, vx, 1.45, minInnerZ + 0.02);
    }, false);

    // 3. Walk-in Shower Enclosure (FURNISHED only, omitted in Semi-Furnished)
    if (!isSemi) {
      const showerSize = isCompact ? Math.min(Math.min(uL, uW) * 0.50, 1.10) : Math.min(Math.min(uL, uW) * 0.56, 1.50);
      const showerX = minInnerX + showerSize / 2 + 0.06;
      const showerZ = maxInnerZ - showerSize / 2 - 0.06;

      tryPlaceItem('Shower', showerSize, showerSize, showerX, showerZ, (sx, sz, sw, sd) => {
        // Raised non-slip shower tray
        createMesh(new THREE.BoxGeometry(sw, 0.08, sd), matWhiteCeramic, sx, 0.04, sz);
        // Frameless glass enclosure screen (1.90m tall)
        createMesh(new THREE.BoxGeometry(sw, 1.90, 0.02), matGlass, sx, 0.99, sz - sd / 2);
        // Chrome overhead rain showerhead
        createMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.40, 8), matChrome, sx, 1.68, sz);
        createMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.025, 14), matChrome, sx, 1.86, sz);
      }, true);
    }
  }

  // ROOM TYPE 5: DINING ROOM
  else if (type === 'dining') {
    const isSmall = uL < 3.4 || uW < 3.0;

    const tableW = isSmall || isSemi ? Math.max(1.50, Math.min(uL * 0.52, 2.00)) : Math.max(1.80, Math.min(uL * 0.58, uL - 1.20, 3.40));
    const tableD = isSmall ? Math.max(0.90, Math.min(uW * 0.45, 1.10)) : Math.max(1.00, Math.min(uW * 0.50, 1.45));
    const tableH = 0.78;

    tryPlaceItem('DiningTable', tableW, tableD, 0, 0, (tx, tz, tw, td) => {
      // Dining table surface
      createMesh(new THREE.BoxGeometry(tw, 0.06, td), matWarmWood, tx, tableH - 0.03, tz);
      // Sturdy table legs
      const legR = 0.04;
      const legH = tableH - 0.06;
      const lx = tw / 2 - 0.10;
      const lz = td / 2 - 0.10;
      createMesh(new THREE.CylinderGeometry(legR, legR, legH, 10), matDarkMetal, tx - lx, legH / 2, tz - lz);
      createMesh(new THREE.CylinderGeometry(legR, legR, legH, 10), matDarkMetal, tx + lx, legH / 2, tz - lz);
      createMesh(new THREE.CylinderGeometry(legR, legR, legH, 10), matDarkMetal, tx - lx, legH / 2, tz + lz);
      createMesh(new THREE.CylinderGeometry(legR, legR, legH, 10), matDarkMetal, tx + lx, legH / 2, tz + lz);

      // Ergonomic Dining Chairs
      const addChair = (cx, cz, rotY) => {
        createMesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), matSofa, cx, 0.48, cz, 0, rotY, 0);
        createMesh(new THREE.BoxGeometry(0.46, 0.48, 0.06), matDarkWood, cx, 0.72, cz + (rotY === 0 ? -0.20 : 0.20), 0, rotY, 0);
        createMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), matDarkMetal, cx - 0.18, 0.23, cz - 0.18);
        createMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), matDarkMetal, cx + 0.18, 0.23, cz - 0.18);
        createMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), matDarkMetal, cx - 0.18, 0.23, cz + 0.18);
        createMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), matDarkMetal, cx + 0.18, 0.23, cz + 0.18);
      };

      if (isSmall || isSemi) {
        addChair(tx - tw * 0.25, tz - td / 2 - 0.32, 0);
        addChair(tx + tw * 0.25, tz - td / 2 - 0.32, 0);
        addChair(tx - tw * 0.25, tz + td / 2 + 0.32, Math.PI);
        addChair(tx + tw * 0.25, tz + td / 2 + 0.32, Math.PI);
      } else {
        addChair(tx - tw * 0.33, tz - td / 2 - 0.32, 0);
        addChair(tx, tz - td / 2 - 0.32, 0);
        addChair(tx + tw * 0.33, tz - td / 2 - 0.32, 0);
        addChair(tx - tw * 0.33, tz + td / 2 + 0.32, Math.PI);
        addChair(tx, tz + td / 2 + 0.32, Math.PI);
        addChair(tx + tw * 0.33, tz + td / 2 + 0.32, Math.PI);
      }
    }, false);
  }

  // ROOM TYPE 6: BALCONY
  else if (type === 'balcony') {
    const planterW = Math.max(1.40, Math.min(uL * 0.80, 3.60));
    const planterD = Math.max(0.45, Math.min(uW * 0.38, 0.70));
    const planterZ = maxInnerZ - planterD / 2;

    tryPlaceItem('Planter', planterW, planterD, 0, planterZ, (px, pz, pw, pd) => {
      createMesh(new THREE.BoxGeometry(pw, 0.44, pd), matDarkWood, px, 0.22, pz);
      createMesh(new THREE.SphereGeometry(Math.min(0.28, pd * 0.55), 10, 10), matPlant, px - pw * 0.30, 0.52, pz);
      createMesh(new THREE.SphereGeometry(Math.min(0.32, pd * 0.60), 10, 10), matPlant, px, 0.56, pz);
      createMesh(new THREE.SphereGeometry(Math.min(0.28, pd * 0.55), 10, 10), matPlant, px + pw * 0.30, 0.52, pz);
    }, true);

    // Furnished mode: modern outdoor bistro set
    if (!isSemi && uL >= 3.0) {
      tryPlaceItem('BistroSet', 1.2, 0.9, 0, minInnerZ + 0.55, (bx, bz) => {
        createMesh(new THREE.CylinderGeometry(0.40, 0.40, 0.05, 16), matWhiteWood, bx, 0.76, bz);
        createMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.74, 8), matDarkMetal, bx, 0.37, bz);
        createMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), matSofa, bx - 0.50, 0.48, bz);
        createMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), matSofa, bx + 0.50, 0.48, bz);
      }, true);
    }
  }

  // ROOM TYPE 7: GARAGE
  else if (type === 'garage') {
    // Wheel stop barrier curb
    const curbW = Math.max(2.0, Math.min(uL * 0.70, 3.20));
    createMesh(new THREE.BoxGeometry(curbW, 0.14, 0.22), matCushion, 0, 0.07, minInnerZ + 0.32);

    // Furnished mode: Low-poly sedan car model positioned inside parking bay
    if (!isSemi) {
      const carL = Math.max(3.80, Math.min(uW * 0.78, 5.00));
      const carW = Math.max(1.85, Math.min(uL * 0.55, 2.30));
      const carH = 0.72;

      tryPlaceItem('Car', carW, carL, 0, 0.05, (cx, cz, cw, cl) => {
        // Lower chassis
        createMesh(new THREE.BoxGeometry(cw, carH, cl), matCarBody, cx, 0.48, cz);
        // Cabin & windshield
        createMesh(new THREE.BoxGeometry(cw * 0.84, 0.58, cl * 0.54), matDarkMetal, cx, 1.05, cz - 0.08);
        createMesh(new THREE.BoxGeometry(cw * 0.82, 0.44, 0.02), matGlass, cx, 1.05, cz + cl * 0.18, -0.35);
        // 4 wheels with rubber tires
        const wheelGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.24, 14);
        createMesh(wheelGeo, matCarTire, cx - cw / 2 - 0.04, 0.30, cz + cl * 0.30, 0, 0, Math.PI / 2);
        createMesh(wheelGeo, matCarTire, cx + cw / 2 + 0.04, 0.30, cz + cl * 0.30, 0, 0, Math.PI / 2);
        createMesh(wheelGeo, matCarTire, cx - cw / 2 - 0.04, 0.30, cz - cl * 0.30, 0, 0, Math.PI / 2);
        createMesh(wheelGeo, matCarTire, cx + cw / 2 + 0.04, 0.30, cz - cl * 0.30, 0, 0, Math.PI / 2);
      }, true);
    }
  }

  // ROOM TYPE 8: STUDY / OFFICE
  else if (type === 'study') {
    const deskW = Math.max(1.40, Math.min(uL * 0.55, uL - 0.80, 2.40));
    const deskD = Math.max(0.70, Math.min(uW * 0.40, 1.05));
    const deskH = 0.76;
    const deskZ = minInnerZ + deskD / 2 + 0.08;

    tryPlaceItem('Desk', deskW, deskD, 0, deskZ, (dx, dz, dw, dd) => {
      createMesh(new THREE.BoxGeometry(dw, 0.06, dd), matWarmWood, dx, deskH - 0.03, dz);
      createMesh(new THREE.BoxGeometry(dw, deskH - 0.06, 0.05), matDarkMetal, dx, (deskH - 0.06) / 2, dz - dd / 2 + 0.025);
      // Laptop computer
      createMesh(new THREE.BoxGeometry(0.45, 0.02, 0.32), matChrome, dx, deskH + 0.01, dz);
      createMesh(new THREE.BoxGeometry(0.45, 0.28, 0.02), matDarkMetal, dx, deskH + 0.15, dz - 0.12, -0.22);
      // Office desk chair
      const chairZ = dz + dd / 2 + 0.42;
      createMesh(new THREE.BoxGeometry(0.52, 0.10, 0.52), matDarkMetal, dx, 0.48, chairZ);
      createMesh(new THREE.BoxGeometry(0.52, 0.54, 0.08), matDarkMetal, dx, 0.78, chairZ + 0.22);
      createMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 8), matChrome, dx, 0.22, chairZ);
    }, true);
  }

  group.add(furnGroup);
}

// Professional Architectural OrbitControls using official Three.js OrbitControls addon
function setupOrbitControls(camera, domElement, initialTarget, initialCamPos, wallHeight) {
  const controls = new OrbitControls(camera, domElement);
  controls.enabled = true;
  controls.enableRotate = true;
  controls.rotateSpeed = 0.85;
  controls.enablePan = true;
  controls.panSpeed = 0.85;
  controls.screenSpacePanning = true;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.0;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minPolarAngle = 0.05;
  controls.minDistance = 2.5;
  controls.maxDistance = 140.0;
  controls.target.copy(initialTarget);
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  controls.saveState();
  controls.update();

  const zoomIn = () => {
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const newLen = Math.max(controls.minDistance, offset.length() * 0.80);
    offset.setLength(newLen);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  };

  const zoomOut = () => {
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const newLen = Math.min(controls.maxDistance, offset.length() * 1.25);
    offset.setLength(newLen);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  };

  const reset = () => {
    controls.target.copy(initialTarget);
    camera.position.copy(initialCamPos);
    controls.update();
  };

  const setTopDown = (isTop) => {
    if (isTop) {
      controls.target.set(0, 0, 0);
      const dist = initialCamPos.distanceTo(initialTarget);
      camera.position.set(0, dist * 0.95, 0.001);
    } else {
      controls.target.copy(initialTarget);
      camera.position.copy(initialCamPos);
    }
    controls.update();
  };

  const focus = (x, z) => {
    controls.target.set(x, wallHeight * 0.35, z);
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    offset.setLength(Math.max(controls.minDistance + 2, 7.5));
    camera.position.copy(controls.target).add(offset);
    controls.update();
  };

  return {
    controls,
    zoomIn,
    zoomOut,
    reset,
    setTopDown,
    focus,
    dispose: () => controls.dispose(),
  };
}


// Generate realistic architectural doors between connected rooms and main entrance
function generatePropertyDoors(rooms) {
  if (!rooms || !rooms.length) return [];
  const doors = [];
  const EPS = 0.06;

  // 1. Find all physical shared wall segments between all room pairs
  const sharedContacts = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const r1 = rooms[i];
      const r2 = rooms[j];

      // Check horizontal contact (along X, constant Z)
      let touchZ = null;
      if (Math.abs(r1.maxZ - r2.minZ) < EPS) touchZ = (r1.maxZ + r2.minZ) / 2;
      else if (Math.abs(r1.minZ - r2.maxZ) < EPS) touchZ = (r1.minZ + r2.maxZ) / 2;

      if (touchZ !== null) {
        const xStart = Math.max(r1.minX, r2.minX);
        const xEnd = Math.min(r1.maxX, r2.maxX);
        const len = xEnd - xStart;
        if (len >= 0.80) {
          sharedContacts.push({
            orientation: 'horizontal',
            z: touchZ,
            start: xStart,
            end: xEnd,
            len,
            r1,
            r2,
          });
        }
      }

      // Check vertical contact (along Z, constant X)
      let touchX = null;
      if (Math.abs(r1.maxX - r2.minX) < EPS) touchX = (r1.maxX + r2.minX) / 2;
      else if (Math.abs(r1.minX - r2.maxX) < EPS) touchX = (r1.minX + r2.maxX) / 2;

      if (touchX !== null) {
        const zStart = Math.max(r1.minZ, r2.minZ);
        const zEnd = Math.min(r1.maxZ, r2.maxZ);
        const len = zEnd - zStart;
        if (len >= 0.80) {
          sharedContacts.push({
            orientation: 'vertical',
            x: touchX,
            start: zStart,
            end: zEnd,
            len,
            r1,
            r2,
          });
        }
      }
    }
  }

  // 2. Identify Living Room as main anchor
  const livingRoom = rooms.find((r) => r.type === 'living') || rooms[0];

  // 3. FRONT ENTRANCE DOOR: Placed on Living Room's exterior wall
  // Check which exterior wall of Living Room is free (no other room touching)
  const isSouthFree = !rooms.some((o) => o.id !== livingRoom.id && Math.abs(o.minZ - livingRoom.maxZ) < EPS && Math.min(o.maxX, livingRoom.maxX) > Math.max(o.minX, livingRoom.minX));
  const isEastFree = !rooms.some((o) => o.id !== livingRoom.id && Math.abs(o.minX - livingRoom.maxX) < EPS && Math.min(o.maxZ, livingRoom.maxZ) > Math.max(o.minZ, livingRoom.minZ));
  const isWestFree = !rooms.some((o) => o.id !== livingRoom.id && Math.abs(o.maxX - livingRoom.minX) < EPS && Math.min(o.maxZ, livingRoom.maxZ) > Math.max(o.minZ, livingRoom.minZ));
  const isNorthFree = !rooms.some((o) => o.id !== livingRoom.id && Math.abs(o.maxZ - livingRoom.minZ) < EPS && Math.min(o.maxX, livingRoom.maxX) > Math.max(o.minX, livingRoom.minX));

  if (isSouthFree) {
    doors.push({
      id: 'door-front-entrance',
      roomIds: [livingRoom.id],
      orientation: 'horizontal',
      x: livingRoom.x,
      z: livingRoom.maxZ,
      width: 0.95,
      height: 1.72,
      type: 'front',
      label: 'Main Entrance',
    });
  } else if (isEastFree) {
    doors.push({
      id: 'door-front-entrance',
      roomIds: [livingRoom.id],
      orientation: 'vertical',
      x: livingRoom.maxX,
      z: livingRoom.z,
      width: 0.95,
      height: 1.72,
      type: 'front',
      label: 'Main Entrance',
    });
  } else if (isWestFree) {
    doors.push({
      id: 'door-front-entrance',
      roomIds: [livingRoom.id],
      orientation: 'vertical',
      x: livingRoom.minX,
      z: livingRoom.z,
      width: 0.95,
      height: 1.72,
      type: 'front',
      label: 'Main Entrance',
    });
  } else {
    doors.push({
      id: 'door-front-entrance',
      roomIds: [livingRoom.id],
      orientation: 'horizontal',
      x: livingRoom.x,
      z: livingRoom.minZ,
      width: 0.95,
      height: 1.72,
      type: 'front',
      label: 'Main Entrance',
    });
  }

  // 4. Connect other rooms using BFS / priority tree rooted at livingRoom
  const connected = new Set([livingRoom.id]);
  const addedRoomDoors = new Set();

  // Helper to add an interior door along a contact segment
  const addInteriorDoor = (contact, roomToConnect) => {
    if (addedRoomDoors.has(roomToConnect.id)) return;
    const isBath = roomToConnect.type === 'bathroom';
    const isBalcony = roomToConnect.type === 'balcony';
    const dWidth = isBalcony ? 1.05 : (isBath ? 0.78 : 0.85);

    // Place door comfortably along the shared contact length
    const mid = (contact.start + contact.end) / 2;
    const doorX = contact.orientation === 'horizontal' ? mid : contact.x;
    const doorZ = contact.orientation === 'vertical' ? mid : contact.z;

    doors.push({
      id: `door-${roomToConnect.id}`,
      roomIds: [contact.r1.id, contact.r2.id],
      orientation: contact.orientation,
      x: doorX,
      z: doorZ,
      width: dWidth,
      height: 1.68,
      type: isBalcony ? 'balcony' : 'interior',
      label: `${roomToConnect.name} Door`,
    });

    connected.add(roomToConnect.id);
    addedRoomDoors.add(roomToConnect.id);
  };

  // PASS 1: Dynamic Attached Pairs (all attached bathrooms to their bedrooms, utility to kitchen)
  rooms.forEach((r) => {
    const rName = (r.name || '').toLowerCase();
    if (r.type === 'bathroom' && (rName.includes('attached') || rName.includes('master'))) {
      const bedContact = sharedContacts.find(
        (c) => ((c.r1.id === r.id && c.r2.type === 'bedroom') || (c.r2.id === r.id && c.r1.type === 'bedroom'))
      );
      if (bedContact) {
        addInteriorDoor(bedContact, r);
      }
    } else if (r.type === 'utility' || rName.includes('utility') || rName.includes('wash')) {
      const kitchContact = sharedContacts.find(
        (c) => ((c.r1.id === r.id && c.r2.type === 'kitchen') || (c.r2.id === r.id && c.r1.type === 'kitchen'))
      );
      if (kitchContact) {
        addInteriorDoor(kitchContact, r);
      }
    }
  });

  // PASS 2: Connect rooms directly touching Living Room (highest priority circulation)
  sharedContacts
    .filter((c) => c.r1.id === livingRoom.id || c.r2.id === livingRoom.id)
    .sort((a, b) => b.len - a.len)
    .forEach((c) => {
      const other = c.r1.id === livingRoom.id ? c.r2 : c.r1;
      if (!connected.has(other.id)) {
        addInteriorDoor(c, other);
      }
    });

  // PASS 3: Connect rooms touching any already-connected room
  let progress = true;
  while (progress && connected.size < rooms.length) {
    progress = false;
    for (const c of sharedContacts) {
      const r1Conn = connected.has(c.r1.id);
      const r2Conn = connected.has(c.r2.id);
      if ((r1Conn && !r2Conn) || (!r1Conn && r2Conn)) {
        const unconnected = r1Conn ? c.r2 : c.r1;
        addInteriorDoor(c, unconnected);
        progress = true;
      }
    }
  }

  // PASS 4: If any room is still somehow disconnected, find best contact with any room
  rooms.forEach((r) => {
    if (!addedRoomDoors.has(r.id) && r.id !== livingRoom.id) {
      const bestContact = sharedContacts
        .filter((c) => c.r1.id === r.id || c.r2.id === r.id)
        .sort((a, b) => b.len - a.len)[0];
      if (bestContact) {
        addInteriorDoor(bestContact, r);
      }
    }
  });

  return doors;
}

// Extract unique, non-overlapping architectural wall segments across all rooms
// Completely eliminates double walls, Z-fighting, and overlapping coping caps
function extractUniqueWallSegments(rooms) {
  const EPS = 0.04;
  const segments = [];

  // 1. HORIZONTAL WALLS (constant Z, varying X)
  const zCoords = [];
  rooms.forEach((r) => {
    [r.minZ, r.maxZ].forEach((zVal) => {
      if (!zCoords.some((z) => Math.abs(z - zVal) < EPS)) {
        zCoords.push(zVal);
      }
    });
  });

  zCoords.forEach((z) => {
    const edges = [];
    rooms.forEach((r) => {
      if (Math.abs(r.minZ - z) < EPS || Math.abs(r.maxZ - z) < EPS) {
        edges.push({ start: r.minX, end: r.maxX, room: r });
      }
    });

    const xPoints = [];
    edges.forEach((e) => {
      [e.start, e.end].forEach((xVal) => {
        if (!xPoints.some((x) => Math.abs(x - xVal) < EPS)) {
          xPoints.push(xVal);
        }
      });
    });
    xPoints.sort((a, b) => a - b);

    const intervals = [];
    for (let i = 0; i < xPoints.length - 1; i++) {
      const x1 = xPoints[i];
      const x2 = xPoints[i + 1];
      const len = x2 - x1;
      if (len < 0.05) continue;
      const xMid = (x1 + x2) / 2;

      const coveringRooms = edges.filter((e) => xMid >= e.start - 0.01 && xMid <= e.end + 0.01);
      if (coveringRooms.length > 0) {
        intervals.push({
          start: x1,
          end: x2,
          isShared: coveringRooms.length >= 2,
        });
      }
    }

    let curr = null;
    intervals.forEach((iv) => {
      if (!curr) {
        curr = { ...iv };
      } else if (Math.abs(curr.end - iv.start) < EPS) {
        curr.end = iv.end;
        if (iv.isShared) curr.isShared = true;
      } else {
        segments.push({ isHorizontal: true, z, start: curr.start, end: curr.end, isShared: curr.isShared });
        curr = { ...iv };
      }
    });
    if (curr) {
      segments.push({ isHorizontal: true, z, start: curr.start, end: curr.end, isShared: curr.isShared });
    }
  });

  // 2. VERTICAL WALLS (constant X, varying Z)
  const xCoords = [];
  rooms.forEach((r) => {
    [r.minX, r.maxX].forEach((xVal) => {
      if (!xCoords.some((x) => Math.abs(x - xVal) < EPS)) {
        xCoords.push(xVal);
      }
    });
  });

  xCoords.forEach((x) => {
    const edges = [];
    rooms.forEach((r) => {
      if (Math.abs(r.minX - x) < EPS || Math.abs(r.maxX - x) < EPS) {
        edges.push({ start: r.minZ, end: r.maxZ, room: r });
      }
    });

    const zPoints = [];
    edges.forEach((e) => {
      [e.start, e.end].forEach((zVal) => {
        if (!zPoints.some((z) => Math.abs(z - zVal) < EPS)) {
          zPoints.push(zVal);
        }
      });
    });
    zPoints.sort((a, b) => a - b);

    const intervals = [];
    for (let i = 0; i < zPoints.length - 1; i++) {
      const z1 = zPoints[i];
      const z2 = zPoints[i + 1];
      const len = z2 - z1;
      if (len < 0.05) continue;
      const zMid = (z1 + z2) / 2;

      const coveringRooms = edges.filter((e) => zMid >= e.start - 0.01 && zMid <= e.end + 0.01);
      if (coveringRooms.length > 0) {
        intervals.push({
          start: z1,
          end: z2,
          isShared: coveringRooms.length >= 2,
        });
      }
    }

    let curr = null;
    intervals.forEach((iv) => {
      if (!curr) {
        curr = { ...iv };
      } else if (Math.abs(curr.end - iv.start) < EPS) {
        curr.end = iv.end;
        if (iv.isShared) curr.isShared = true;
      } else {
        segments.push({ isHorizontal: false, x, start: curr.start, end: curr.end, isShared: curr.isShared });
        curr = { ...iv };
      }
    });
    if (curr) {
      segments.push({ isHorizontal: false, x, start: curr.start, end: curr.end, isShared: curr.isShared });
    }
  });

  return segments;
}

// Split a solid wall at door openings to create physical doorways with top lintels
function splitWallWithDoors(start, end, doors, axisPos, wallHeight, wallThickness, isHorizontal) {
  const sorted = [...doors].sort((a, b) => (isHorizontal ? a.x - b.x : a.z - b.z));
  const segments = [];
  let curr = start;

  sorted.forEach((d) => {
    const dPos = isHorizontal ? d.x : d.z;
    const dStart = dPos - d.width / 2;
    const dEnd = dPos + d.width / 2;

    if (dStart > curr + 0.05) {
      const segLen = dStart - curr;
      const segCenter = curr + segLen / 2;
      segments.push({
        type: 'wall',
        w: isHorizontal ? segLen : wallThickness,
        d: isHorizontal ? wallThickness : segLen,
        h: wallHeight,
        x: isHorizontal ? segCenter : axisPos,
        z: isHorizontal ? axisPos : segCenter,
        y: wallHeight / 2 + 0.025,
      });
    }

    // Overhead lintel wall above the doorway opening
    const lintelH = Math.max(0.1, wallHeight - d.height);
    segments.push({
      type: 'lintel',
      w: isHorizontal ? d.width : wallThickness,
      d: isHorizontal ? wallThickness : d.width,
      h: lintelH,
      x: isHorizontal ? dPos : axisPos,
      z: isHorizontal ? axisPos : dPos,
      y: d.height + lintelH / 2 + 0.025,
    });

    curr = dEnd;
  });

  if (end > curr + 0.05) {
    const segLen = end - curr;
    const segCenter = curr + segLen / 2;
    segments.push({
      type: 'wall',
      w: isHorizontal ? segLen : wallThickness,
      d: isHorizontal ? wallThickness : segLen,
      h: wallHeight,
      x: isHorizontal ? segCenter : axisPos,
      z: isHorizontal ? axisPos : segCenter,
      y: wallHeight / 2 + 0.025,
    });
  }

  return segments;
}

// Render realistic architectural 3D door with frame, threshold, hinged open leaf, and metallic handles
function render3DDoor(door, parentGroup, geometries, materials, wallThickness) {
  const doorGroup = new THREE.Group();
  doorGroup.position.set(door.x, 0.025, door.z);
  if (door.orientation === 'vertical') {
    doorGroup.rotation.y = Math.PI / 2;
  }

  const { doorFrameMat, doorLeafMat, doorHandleMat, doorSaddleMat } = materials;
  const dw = door.width;
  const dh = door.height;
  const frameD = wallThickness + 0.03;
  const jambW = 0.05;

  const addPart = (geo, mat, px, py, pz) => {
    geometries.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    m.receiveShadow = true;
    doorGroup.add(m);
    return m;
  };

  // 1. Frame: Left Jamb, Right Jamb, Top Header
  addPart(new THREE.BoxGeometry(jambW, dh, frameD), doorFrameMat, -dw / 2 + jambW / 2, dh / 2, 0);
  addPart(new THREE.BoxGeometry(jambW, dh, frameD), doorFrameMat, dw / 2 - jambW / 2, dh / 2, 0);
  addPart(new THREE.BoxGeometry(dw + 0.04, jambW, frameD), doorFrameMat, 0, dh + jambW / 2, 0);

  // 2. Floor Saddle / Transition Threshold
  addPart(new THREE.BoxGeometry(dw, 0.015, frameD), doorSaddleMat, 0, 0.008, 0);

  // 3. Hinged Door Leaf (Panel) - open ajar by ~26 degrees (0.45 rad)
  const leafW = dw - jambW * 2;
  const leafH = dh - 0.02;
  const leafThick = 0.038;
  const openAngle = door.type === 'front' ? 0.35 : 0.45;

  const leafPivot = new THREE.Group();
  leafPivot.position.set(-dw / 2 + jambW, 0, 0);
  leafPivot.rotation.y = openAngle;
  doorGroup.add(leafPivot);

  // Main door leaf panel
  const leafGeo = new THREE.BoxGeometry(leafW, leafH, leafThick);
  geometries.push(leafGeo);
  const leafMesh = new THREE.Mesh(leafGeo, doorLeafMat);
  leafMesh.position.set(leafW / 2, leafH / 2, 0);
  leafMesh.castShadow = true;
  leafMesh.receiveShadow = true;
  leafPivot.add(leafMesh);

  // Architectural panel detail (embossed inner insets on both sides)
  const insetW = leafW * 0.72;
  const insetH = leafH * 0.38;
  [-1, 1].forEach((side) => {
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(insetW, insetH, 0.006), doorFrameMat);
    p1.position.set(leafW / 2, leafH * 0.70, side * (leafThick / 2 + 0.003));
    leafPivot.add(p1);
    geometries.push(p1.geometry);

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(insetW, insetH, 0.006), doorFrameMat);
    p2.position.set(leafW / 2, leafH * 0.28, side * (leafThick / 2 + 0.003));
    leafPivot.add(p2);
    geometries.push(p2.geometry);
  });

  // 4. Metallic Door Handles (Lever & Plate)
  const handleX = leafW - 0.06;
  const handleY = 0.85;
  [-1, 1].forEach((side) => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.13, 0.006), doorHandleMat);
    plate.position.set(handleX, handleY, side * (leafThick / 2 + 0.003));
    leafPivot.add(plate);
    geometries.push(plate.geometry);

    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.02), doorHandleMat);
    lever.position.set(handleX - 0.025, handleY, side * (leafThick / 2 + 0.035));
    leafPivot.add(lever);
    geometries.push(lever.geometry);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.03, 8), doorHandleMat);
    stem.rotation.x = Math.PI / 2;
    stem.position.set(handleX, handleY, side * (leafThick / 2 + 0.018));
    leafPivot.add(stem);
    geometries.push(stem.geometry);
  });

  parentGroup.add(doorGroup);
}

// Render architectural staircase with risers, treads, and handrail ONLY if present in property data or floor plan
function renderStaircase(room, parentGroup, geometries, materials, wallHeight = 1.85) {
  const stairGroup = new THREE.Group();
  stairGroup.position.set(room.x, 0.025, room.z);

  const stepCount = 12;
  const stairW = Math.min(room.lM * 0.45, 1.15);
  const stairL = Math.min(room.wM * 0.78, 2.85);
  const stepD = stairL / stepCount;
  const stepH = (wallHeight * 0.85) / stepCount;

  const stepMat = new THREE.MeshStandardMaterial({ color: 0x926239, roughness: 0.65 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 });
  materials.push(stepMat, railMat);

  for (let i = 0; i < stepCount; i++) {
    const stepGeo = new THREE.BoxGeometry(stairW, stepH, stepD);
    geometries.push(stepGeo);
    const stepMesh = new THREE.Mesh(stepGeo, stepMat);
    stepMesh.position.set(0, (i + 0.5) * stepH, -stairL / 2 + (i + 0.5) * stepD);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    stairGroup.add(stepMesh);
  }

  // Metal Handrail
  const railGeo = new THREE.BoxGeometry(0.04, 0.04, stairL);
  geometries.push(railGeo);
  const railMesh = new THREE.Mesh(railGeo, railMat);
  railMesh.position.set(stairW / 2, (wallHeight * 0.85) / 2 + 0.85, 0);
  stairGroup.add(railMesh);

  parentGroup.add(stairGroup);
}

export function hasExistingFloorPlanLayout(fp, cfg, propCanonical) {
  if (!fp && !propCanonical) return false;

  // If explicitly failed, do not consider it valid
  if (fp?.status === 'failed' || fp?.layout?.status === 'failed' || propCanonical?.status === 'failed') {
    return false;
  }

  // 1. Canonical layout rooms present
  if (Array.isArray(fp?.layout?.rooms) && fp.layout.rooms.length > 0) return true;
  if (Array.isArray(propCanonical?.rooms) && propCanonical.rooms.length > 0) return true;
  if (Array.isArray(cfg?.canonicalLayout?.rooms) && cfg.canonicalLayout.rooms.length > 0) return true;

  // 2. Vector room placements present
  if (Array.isArray(fp?.roomPlacements) && fp.roomPlacements.length > 0) return true;
  if (Array.isArray(fp?.layout?.roomPlacements) && fp.layout.roomPlacements.length > 0) return true;

  // 3. Raster compartments present
  if (Array.isArray(fp?.compartments) && fp.compartments.length > 0) return true;
  if (Array.isArray(fp?.layout?.compartments) && fp.layout.compartments.length > 0) return true;

  // 4. Explicitly marked processed with layout object
  if (fp?.status === 'processed' && fp?.layout && typeof fp.layout === 'object') return true;

  return false;
}

export default function Room3D({
  config,
  floorPlan,
  canonicalLayout: propCanonicalLayout,
  rooms: propRooms,
  furnishing,
  furnished,
  propertyType,
  type,
  listingType,
  transactionType,
  isLand: isLandProp,
  length = 12,
  width = 10,
  height = 9,
  bedrooms = 1,
  bathrooms = 1,
  kitchen = 1,
  hall = 1,
  sqft = 0,
  parking = 0,
  floors = 1,
}) {
  const mountRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);
  const centerRef = useRef({ x: 0, z: 0 });
  const handleMountRef = useCallback((node) => {
    mountRef.current = node;
    setMountNode(node);
  }, []);
  const controlsRef = useRef(null);
  const labelsRef = useRef([]);
  const [selectedId, setSelectedId] = useState('');
  const [showNames, setShowNames] = useState(true);
  const [isTopDown, setIsTopDown] = useState(false);

  const rawFloorPlan = floorPlan || config?.floorPlan;
  const activeFloorPlan = useMemo(() => {
    if (!rawFloorPlan) return null;
    return {
      ...rawFloorPlan,
      url: resolveMediaUrl(rawFloorPlan.url),
    };
  }, [rawFloorPlan]);
  const canonicalCandidate = propCanonicalLayout || activeFloorPlan?.layout || config?.canonicalLayout;
  const rawFurnishing = furnishing || furnished || config?.furnishing || config?.furnished || '';
  const furnishingMode = normalizeFurnishing(rawFurnishing);

  const isLand = Boolean(isLandProp) ||
    Boolean(config?.isLand) ||
    Boolean(canonicalCandidate?.isLand) ||
    isPlotOrLandType(propertyType || type || config?.propertyType || config?.type || canonicalCandidate?.propertyType) ||
    (Array.isArray(propRooms) && propRooms.length === 1 && (
      (propRooms[0]?.name || '').toLowerCase().includes('plot') ||
      (propRooms[0]?.name || '').toLowerCase().includes('land') ||
      propRooms[0]?.type === 'land' ||
      propRooms[0]?.type === 'plot'
    ));

  const isCommercial =
    (propertyType || type || config?.propertyType || config?.type || '').toLowerCase() === 'commercial' ||
    Boolean(config?.isCommercial);

  const isPdfPlan = Boolean(
    activeFloorPlan?.isPdf ||
    (activeFloorPlan?.url && activeFloorPlan.url.toLowerCase().split('?')[0].endsWith('.pdf')) ||
    (activeFloorPlan?.name && activeFloorPlan.name.toLowerCase().endsWith('.pdf'))
  );

  const initialStatus = useMemo(() => {
    if (!activeFloorPlan?.url) return 'idle';
    if (isPdfPlan || activeFloorPlan.isPdf) return 'unsupported_pdf';
    if (activeFloorPlan.status === 'failed' || activeFloorPlan.layout?.status === 'failed') return 'failed';
    if (hasExistingFloorPlanLayout(activeFloorPlan, config, canonicalCandidate)) return 'processed';
    if (activeFloorPlan.status === 'processed') return 'processed';
    return 'analyzing';
  }, [activeFloorPlan?.url, activeFloorPlan?.status, activeFloorPlan?.layout, activeFloorPlan?.isPdf, isPdfPlan, config, canonicalCandidate]);

  // Async analysis state
  const [asyncLayout, setAsyncLayout] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState(initialStatus);
  const [analysisError, setAnalysisError] = useState(
    activeFloorPlan?.error || activeFloorPlan?.layout?.error || ''
  );

  const inFlightRef = useRef('');
  const timeoutRef = useRef(null);

  const triggerAnalysis = useCallback((force = false) => {
    const planUrl = activeFloorPlan?.url;
    if (!planUrl || isPdfPlan) return;

    if (!force && inFlightRef.current === planUrl) {
      return;
    }

    inFlightRef.current = planUrl;
    setAnalysisStatus('analyzing');
    setAnalysisError('');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    let isAborted = false;

    // Timeout protection: 8 seconds maximum
    timeoutRef.current = setTimeout(() => {
      if (inFlightRef.current === planUrl) {
        isAborted = true;
        inFlightRef.current = '';
        setAnalysisStatus('failed');
        setAnalysisError('Floor plan analysis timed out after 8 seconds. Please check network connection or retry.');
      }
    }, 8000);

    analyzeFloorPlanFile({ name: activeFloorPlan.name || 'plan.png' }, planUrl)
      .then((res) => {
        if (isAborted || inFlightRef.current !== planUrl) return;
        clearTimeout(timeoutRef.current);
        inFlightRef.current = '';

        if (res && res.status === 'processed') {
          setAsyncLayout(res);
          setAnalysisStatus('processed');
          setAnalysisError('');
        } else {
          setAnalysisStatus('failed');
          setAnalysisError(res?.error || 'Floor plan analysis could not extract spatial room boundaries.');
        }
      })
      .catch((e) => {
        if (isAborted || inFlightRef.current !== planUrl) return;
        clearTimeout(timeoutRef.current);
        inFlightRef.current = '';
        setAnalysisStatus('failed');
        setAnalysisError(e.message || 'Error occurred while analyzing floor plan.');
      });
  }, [activeFloorPlan?.url, activeFloorPlan?.name]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const planUrl = activeFloorPlan?.url;
    if (!planUrl) {
      setAnalysisStatus('idle');
      setAnalysisError('');
      setAsyncLayout(null);
      inFlightRef.current = '';
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (activeFloorPlan.status === 'failed' || activeFloorPlan.layout?.status === 'failed') {
      setAnalysisStatus('failed');
      setAnalysisError(activeFloorPlan.error || activeFloorPlan.layout?.error || 'Floor plan analysis failed.');
      inFlightRef.current = '';
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (hasExistingFloorPlanLayout(activeFloorPlan, config, canonicalCandidate)) {
      setAnalysisStatus('processed');
      setAnalysisError('');
      inFlightRef.current = '';
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    triggerAnalysis();
  }, [
    activeFloorPlan?.url,
    activeFloorPlan?.status,
    activeFloorPlan?.error,
    activeFloorPlan?.layout,
    activeFloorPlan?.roomPlacements,
    activeFloorPlan?.compartments,
    config?.canonicalLayout,
    canonicalCandidate,
    triggerAnalysis,
  ]);

  const effectiveLayout = useMemo(() => {
    if (activeFloorPlan?.url) {
      if (isPdfPlan || analysisStatus === 'unsupported_pdf') {
        return null;
      }
      if (analysisStatus === 'failed') {
        return { status: 'failed', error: analysisError || activeFloorPlan.error || 'Floor plan analysis failed' };
      }
      if (asyncLayout && asyncLayout.status === 'processed') {
        return {
          ...(activeFloorPlan.layout || {}),
          ...asyncLayout,
          status: 'processed',
        };
      }
      if (activeFloorPlan.layout) {
        return activeFloorPlan.layout;
      }
      if (canonicalCandidate) {
        return canonicalCandidate;
      }
      if ((Array.isArray(activeFloorPlan.roomPlacements) && activeFloorPlan.roomPlacements.length > 0) ||
          (Array.isArray(activeFloorPlan.compartments) && activeFloorPlan.compartments.length > 0)) {
        return {
          aspectRatio: activeFloorPlan.aspectRatio || 1.25,
          roomPlacements: activeFloorPlan.roomPlacements || [],
          compartments: activeFloorPlan.compartments || [],
          status: 'processed',
        };
      }
      return asyncLayout;
    }
    return null;
  }, [activeFloorPlan, asyncLayout, analysisStatus, analysisError, canonicalCandidate]);

  // Stable key for property configuration to avoid tearing down the 3D scene on unrelated parent renders
  const roomsKey = useMemo(() => {
    return JSON.stringify({
      config,
      effectiveLayout: effectiveLayout ? {
        aspectRatio: effectiveLayout.aspectRatio,
        roomsCount: effectiveLayout.rooms?.length,
        compartmentsCount: effectiveLayout.compartments?.length,
        placementsCount: effectiveLayout.roomPlacements?.length,
        status: effectiveLayout.status,
      } : (activeFloorPlan?.url || null),
      propRooms,
      furnishingMode,
      length,
      width,
      height,
      bedrooms,
      bathrooms,
      kitchen,
      hall,
      sqft,
      parking,
      floors,
      isLand,
      propertyType: propertyType || type || config?.propertyType || config?.type,
    });
  }, [config, effectiveLayout, activeFloorPlan?.url, propRooms, furnishingMode, length, width, height, bedrooms, bathrooms, kitchen, hall, sqft, parking, floors, isLand, propertyType, type]);

  const { normalizedRooms, defaultApplied, canonicalLayout, canonicalDoors, validation } = useMemo(() => {
    let appliedFallback = false;
    let list = [];

    const sourceRooms = (config?.floors?.length && config.floors[0]?.rooms?.length)
      ? config.floors[0].rooms
      : (Array.isArray(propRooms) && propRooms.length > 0)
        ? propRooms.flatMap((r, idx) => {
            const count = Math.max(1, Number(r.count) || 1);
            if (count === 1) return [{ ...r, id: r.id || `room-${idx}` }];
            return Array.from({ length: count }, (_, sub) => ({
              ...r,
              id: `${r.id || `room-${idx}`}-${sub}`,
              name: `${r.name || r.type} ${sub + 1}`,
            }));
          })
        : null;

    if (sourceRooms && sourceRooms.length) {
      list = sourceRooms;
    } else {
      appliedFallback = true;
      if (isLand) {
        // PLOT / LAND LISTING: Represent as single dedicated plot boundary with grass
        const plotAreaSqFt = Number(sqft) || (Number(length) > 0 && Number(width) > 0 ? Number(length) * Number(width) : 1200);
        let plotL = Number(length) || 0;
        let plotW = Number(width) || 0;
        if (!plotL || !plotW) {
          // Standard real-estate plot aspect ratio of ~1.33 (e.g. 30x40 for 1200 sqft, 40x60 for 2400 sqft)
          plotW = Math.round(Math.sqrt(plotAreaSqFt / 1.33));
          plotL = Math.round(plotAreaSqFt / Math.max(1, plotW));
        }
        list.push({
          id: 'plot-boundary-0',
          name: 'Plot Area',
          type: 'land',
          length: plotL,
          width: plotW,
          height: 0,
          area: plotAreaSqFt,
          unit: 'ft',
        });
      } else if (isCommercial) {
        // COMMERCIAL LISTING: Represent open commercial / office floor without fabricated residential bedrooms
        const mainL = Math.max(16, Number(length) || 24);
        const mainW = Math.max(12, Number(width) || 18);
        list.push({
          id: 'commercial-main',
          name: 'Main Commercial Space',
          type: 'study', // clean professional / office floor layout
          length: mainL,
          width: mainW,
          height: 10,
          unit: 'ft',
        });
        if (bathrooms > 0) {
          list.push({
            id: 'commercial-restroom',
            name: 'Restroom',
            type: 'bathroom',
            length: 8,
            width: 6,
            height: 9,
            unit: 'ft',
          });
        }
        if (parking > 0) {
          list.push({
            id: 'commercial-parking',
            name: 'Commercial Parking',
            type: 'garage',
            length: 18,
            width: 12,
            height: 9,
            unit: 'ft',
          });
        }
      } else {
        // RESIDENTIAL LISTING: Only residential houses / flats get bedroom / hall / kitchen fallback
        const add = (roomType, count, namePrefix) => {
          const pal = ROOM_PALETTES[roomType] || ROOM_PALETTES.other;
          for (let i = 0; i < count; i += 1) {
            list.push({
              id: `${roomType}-${i}`,
              name: count > 1 ? `${namePrefix} ${i + 1}` : namePrefix,
              type: roomType,
              length: pal.defaultL,
              width: pal.defaultW,
              height: 9,
              unit: 'ft',
            });
          }
        };

        if (hall > 0) add('living', 1, 'Living Room');
        if (kitchen > 0) add('kitchen', 1, 'Kitchen');
        if (hall > 0 && kitchen > 0) add('dining', 1, 'Dining Room');
        add('bedroom', Math.max(Number(bedrooms) || 1, 1), 'Bedroom');
        if (bathrooms > 0) add('bathroom', Number(bathrooms), 'Bathroom');
        if (parking > 0) add('garage', 1, 'Parking Space');
      }
    }

    // Disambiguate all room names first to guarantee zero duplicate names
    const disambiguated = disambiguateRoomNames(list);

    // Build the canonical floor-plan layout (single authoritative source of truth for 2D and 3D)
    const floorPlanContext = activeFloorPlan ? {
      ...activeFloorPlan,
      ...(effectiveLayout || {}),
      layout: effectiveLayout || activeFloorPlan.layout,
      roomPlacements: (effectiveLayout && Array.isArray(effectiveLayout.roomPlacements) && effectiveLayout.roomPlacements.length > 0)
        ? effectiveLayout.roomPlacements
        : (activeFloorPlan.roomPlacements || []),
      status: (analysisStatus === 'failed' || effectiveLayout?.status === 'failed') ? 'failed' : 'processed',
      error: analysisError || effectiveLayout?.error || activeFloorPlan.error || '',
    } : null;

    const canonical = buildCanonicalLayout(disambiguated, floorPlanContext, {
      unit: config?.unit || 'ft',
      wallThickness: config?.wallThickness || (isLand ? 0.12 : 0.16),
      wallHeight: isLand ? 0.40 : 1.85,
      totalFloors: floors,
      propertyId: config?.propertyId || '',
      propertyType: propertyType || type || config?.propertyType || config?.type,
      isLand,
    });

    return {
      canonicalLayout: canonical,
      normalizedRooms: canonical.rooms,
      canonicalDoors: canonical.doors,
      defaultApplied: appliedFallback,
      validation: canonical.validation,
    };
  }, [roomsKey]);

  // Dedicated effect for toggling labels visibility without rebuilding Three.js scene
  useEffect(() => {
    if (labelsRef.current) {
      labelsRef.current.forEach((badge) => {
        badge.visible = showNames;
      });
    }
  }, [showNames]);

  useEffect(() => {
    const mount = mountNode;
    if (!mount || !normalizedRooms.length) {
      return undefined;
    }

    const widthPx = mount.clientWidth || 600;
    const heightPx = mount.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    const houseGroup = new THREE.Group();
    scene.add(houseGroup);

    const wallThickness = isLand ? 0.12 : 0.16;
    const wallHeight = isLand ? 0.40 : 1.85;
    const geometries = [];
    const materials = [];
    const textures = [];
    const labels = [];

    const minX = Math.min(...normalizedRooms.map((r) => r.x - r.lM / 2));
    const maxX = Math.max(...normalizedRooms.map((r) => r.x + r.lM / 2));
    const minZ = Math.min(...normalizedRooms.map((r) => r.z - r.wM / 2));
    const maxZ = Math.max(...normalizedRooms.map((r) => r.z + r.wM / 2));

    const totalSpanX = Math.max(maxX - minX, 1);
    const totalSpanZ = Math.max(maxZ - minZ, 1);
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    centerRef.current = { x: centerX, z: centerZ };

    // Center the entire house group at the world origin so camera framing & orbit rotation are perfectly symmetric
    houseGroup.position.set(-centerX, 0, -centerZ);

    // 1. Identify Doors and Entrances for the complete house layout (NEVER for Plot/Land)
    const propertyDoors = isLand
      ? []
      : ((canonicalDoors && canonicalDoors.length) ? canonicalDoors : generatePropertyDoors(normalizedRooms));

    // 2. Architectural Foundation Plinth (Pedestal) centered at (0, -0.06, 0)
    const plinthL = totalSpanX + (isLand ? 0.2 : 0.7);
    const plinthW = totalSpanZ + (isLand ? 0.2 : 0.7);
    const plinthGeo = new THREE.BoxGeometry(plinthL, isLand ? 0.05 : 0.12, plinthW);
    geometries.push(plinthGeo);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: isLand ? 0xd0dbcd : 0xe2e8f0,
      roughness: 0.9,
    });
    materials.push(plinthMat);
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.set(centerX, isLand ? -0.025 : -0.06, centerZ);
    plinthMesh.receiveShadow = true;
    houseGroup.add(plinthMesh);

    // 3. Shared Wall, Trim & Door Materials
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.88 });
    materials.push(wallMat);
    const wallCapMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    materials.push(wallCapMat);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xcbd5e1 });
    materials.push(edgeMat);

    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    materials.push(doorFrameMat);
    const doorLeafMat = new THREE.MeshStandardMaterial({ color: 0x8a4b18, roughness: 0.45, metalness: 0.05 });
    materials.push(doorLeafMat);
    const doorHandleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 });
    materials.push(doorHandleMat);
    const doorSaddleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    materials.push(doorSaddleMat);

    // 4. Render Deduplicated Architectural Walls with Door Openings & Coping Caps
    // Extracts unique horizontal and vertical wall segments across all rooms (zero overlapping walls, zero Z-fighting)
    const uniqueWallSegments = extractUniqueWallSegments(normalizedRooms);

    uniqueWallSegments.forEach((seg) => {
      const isHoriz = seg.isHorizontal;
      const wallStart = seg.start;
      const wallEnd = seg.end;
      const axisPos = isHoriz ? seg.z : seg.x;

      // Find any doors that sit on this wall segment
      const wallDoors = propertyDoors.filter((d) => {
        if (isHoriz) {
          return (
            d.orientation === 'horizontal' &&
            Math.abs(d.z - axisPos) < 0.06 &&
            d.x >= wallStart + 0.1 &&
            d.x <= wallEnd - 0.1
          );
        } else {
          return (
            d.orientation === 'vertical' &&
            Math.abs(d.x - axisPos) < 0.06 &&
            d.z >= wallStart + 0.1 &&
            d.z <= wallEnd - 0.1
          );
        }
      });

      // Split wall at doors (lintel overhead, solid wall on sides)
      if (wallDoors.length > 0) {
        const wallParts = splitWallWithDoors(wallStart, wallEnd, wallDoors, axisPos, wallHeight, wallThickness, isHoriz);
        wallParts.forEach((part) => {
          const wGeo = new THREE.BoxGeometry(part.w, part.h, part.d);
          geometries.push(wGeo);
          const wMesh = new THREE.Mesh(wGeo, wallMat);
          wMesh.position.set(part.x, part.y, part.z);
          wMesh.castShadow = true;
          wMesh.receiveShadow = true;
          houseGroup.add(wMesh);

          const wEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wGeo), edgeMat);
          wMesh.add(wEdges);
        });
      } else {
        const wallLen = wallEnd - wallStart;
        const w = isHoriz ? wallLen : wallThickness;
        const d = isHoriz ? wallThickness : wallLen;
        const posX = isHoriz ? (wallStart + wallEnd) / 2 : axisPos;
        const posZ = isHoriz ? axisPos : (wallStart + wallEnd) / 2;

        const wGeo = new THREE.BoxGeometry(w, wallHeight, d);
        geometries.push(wGeo);
        const wMesh = new THREE.Mesh(wGeo, wallMat);
        wMesh.position.set(posX, wallHeight / 2 + 0.025, posZ);
        wMesh.castShadow = true;
        wMesh.receiveShadow = true;
        houseGroup.add(wMesh);

        const wEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wGeo), edgeMat);
        wMesh.add(wEdges);
      }

      // Continuous Coping Cap along the entire wall length
      const totalLen = wallEnd - wallStart;
      const capW = isHoriz ? totalLen + (wallThickness * 0.5) : wallThickness + 0.02;
      const capD = isHoriz ? wallThickness + 0.02 : totalLen + (wallThickness * 0.5);
      const capX = isHoriz ? (wallStart + wallEnd) / 2 : axisPos;
      const capZ = isHoriz ? axisPos : (wallStart + wallEnd) / 2;

      const capGeo = new THREE.BoxGeometry(capW, 0.04, capD);
      geometries.push(capGeo);
      const capMesh = new THREE.Mesh(capGeo, wallCapMat);
      capMesh.position.set(capX, wallHeight + 0.045, capZ);
      capMesh.castShadow = true;
      capMesh.receiveShadow = true;
      houseGroup.add(capMesh);
    });

    // 5. Render Each Room: Floor Mesh, Furniture & Room Badge
    normalizedRooms.forEach((room) => {
      const pal = ROOM_PALETTES[room.type] || ROOM_PALETTES.other;

      // Realistic Textured Floor (snugly meeting adjacent rooms with zero gaps)
      const floorGeo = new THREE.BoxGeometry(room.lM + 0.002, 0.05, room.wM + 0.002);
      geometries.push(floorGeo);
      const floorTexType = isLand ? 'grass' : pal.floorType;
      const floorTex = createFloorTexture(floorTexType);
      textures.push(floorTex);
      const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: isLand ? 0.85 : (pal.floorType === 'tile' || pal.floorType === 'bathTile' ? 0.35 : 0.6),
        metalness: isLand ? 0.0 : 0.05,
      });
      materials.push(floorMat);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(room.x, 0.025, room.z);
      floorMesh.receiveShadow = true;
      floorMesh.userData = { roomId: room.id };
      houseGroup.add(floorMesh);

      // Low-Poly Interior 3D Furniture / Structures:
      // STRICT RULE: For Plot/Land properties, NEVER generate doors, furniture, stairs, or interior structures
      if (isLand) {
        // Vacant plot: furniture, stairs, and house-interior structures are strictly omitted
      } else if (room.type === 'staircase' || (room.name || '').toLowerCase().includes('stair')) {
        renderStaircase(room, houseGroup, geometries, materials, wallHeight);
      } else {
        const roomDoors = propertyDoors.filter((d) => d.roomIds.includes(room.id));
        addFurnitureToRoom(room, houseGroup, geometries, materials, furnishingMode, roomDoors);
      }

      // Floating Room Name & Dimension Badge (Exactly ONE badge per room)
      const dimString = isLand
        ? `${Math.round(room.lFt)} × ${Math.round(room.wFt)} ft${room.area ? ` • ${Math.round(room.area).toLocaleString('en-IN')} sq.ft` : ''}`
        : `${Math.round(room.lFt)} × ${Math.round(room.wFt)} ft`;
      const badgeIcon = isLand ? '📐' : pal.icon;
      const badgeName = isLand ? (room.name || 'Plot Area') : room.name;
      const badge = createRoomBadge(badgeName, dimString, badgeIcon);
      const badgeScale = Math.min(Math.max(room.lM * 0.5, 1.3), 3.2);
      badge.scale.set(badgeScale, badgeScale * 0.28, 1);
      badge.position.set(room.x, wallHeight + 0.35, room.z);
      badge.visible = showNames;
      badge.userData = { roomId: room.id };
      houseGroup.add(badge);
      labels.push(badge);
    });

    labelsRef.current = labels;

    // 6. Render Realistic 3D Doors in all doorways (NEVER for Plot/Land)
    if (!isLand && propertyDoors.length > 0) {
      const doorMats = { doorFrameMat, doorLeafMat, doorHandleMat, doorSaddleMat };
      propertyDoors.forEach((door) => {
        render3DDoor(door, houseGroup, geometries, doorMats, wallThickness);
      });
    }

    // 8. Professional Architectural Lighting & Soft Shadows
    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x334155, 0.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
    sunLight.position.set(plinthL * 1.0, wallHeight * 4.5, plinthW * 1.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = Math.max(plinthL, plinthW) * 8;
    const d = Math.max(plinthL, plinthW) * 0.85;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.radius = 2.0;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.45);
    fillLight.position.set(-plinthL * 0.9, wallHeight * 2.5, -plinthW * 0.9);
    scene.add(fillLight);

    // 9. Perspective Camera - Optimized Perspective Framing for balanced 3D space usage
    const aspect = widthPx / heightPx;
    const fovYDeg = 38;
    const fovYRad = (fovYDeg * Math.PI) / 180;
    const tanHalfY = Math.tan(fovYRad / 2);
    const tanHalfX = tanHalfY * aspect;
    const camera = new THREE.PerspectiveCamera(fovYDeg, aspect, 0.1, 1000);

    const theta = Math.PI / 4;
    const phi = Math.PI * 0.28; // ~50.4 degrees elevation
    const camDir = new THREE.Vector3(
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.cos(theta)
    ).normalize();

    const cameraTarget = new THREE.Vector3(0, wallHeight * 0.35, 0);

    // Compute bounding box corners centered at origin with comfortable safety margin
    const halfX = totalSpanX / 2 + 0.35;
    const halfZ = totalSpanZ / 2 + 0.35;
    const corners = [
      new THREE.Vector3(-halfX, 0, -halfZ),
      new THREE.Vector3(halfX, 0, -halfZ),
      new THREE.Vector3(-halfX, wallHeight + 0.45, -halfZ),
      new THREE.Vector3(halfX, wallHeight + 0.45, -halfZ),
      new THREE.Vector3(-halfX, 0, halfZ),
      new THREE.Vector3(halfX, 0, halfZ),
      new THREE.Vector3(-halfX, wallHeight + 0.45, halfZ),
      new THREE.Vector3(halfX, wallHeight + 0.45, halfZ),
    ];

    let cameraDistance = 15;
    for (let dist = 4; dist <= 80; dist += 0.25) {
      const testCamPos = new THREE.Vector3().copy(cameraTarget).addScaledVector(camDir, dist);
      const fwd = new THREE.Vector3().subVectors(cameraTarget, testCamPos).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
      const trueUp = new THREE.Vector3().crossVectors(right, fwd).normalize();

      let maxNDC = 0;
      for (const pt of corners) {
        const rel = new THREE.Vector3().subVectors(pt, testCamPos);
        const zDepth = rel.dot(fwd);
        if (zDepth <= 0) { maxNDC = 999; break; }
        const xNDC = Math.abs(rel.dot(right)) / (zDepth * tanHalfX);
        const yNDC = Math.abs(rel.dot(trueUp)) / (zDepth * tanHalfY);
        maxNDC = Math.max(maxNDC, xNDC, yNDC);
      }

      if (maxNDC <= 0.84) {
        cameraDistance = dist;
        break;
      }
    }

    const initialCamPos = new THREE.Vector3().copy(cameraTarget).addScaledVector(camDir, cameraDistance);
    camera.position.copy(initialCamPos);
    camera.lookAt(cameraTarget);

    // 8. WebGL Renderer with Shadows & Tonemapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.userSelect = 'none';
    renderer.domElement.style.webkitUserSelect = 'none';
    renderer.domElement.style.outline = 'none';
    renderer.domElement.style.cursor = 'grab';
    mount.appendChild(renderer.domElement);

    const controlsWrapper = setupOrbitControls(camera, renderer.domElement, cameraTarget, initialCamPos, wallHeight);
    controlsRef.current = controlsWrapper;

    // Prevent context menu from popping up on right-click pan
    const handleContextMenu = (e) => e.preventDefault();
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    mount.addEventListener('contextmenu', handleContextMenu);

    // Dynamic cursor feedback for grabbing/dragging
    const handlePointerDown = () => {
      renderer.domElement.style.cursor = 'grabbing';
    };
    const handlePointerUp = () => {
      renderer.domElement.style.cursor = 'grab';
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controlsWrapper.controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        controlsWrapper.controls.update();
      }
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            controlsWrapper.controls.update();
          }
        }
      });
      resizeObserver.observe(mount);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      mount.removeEventListener('contextmenu', handleContextMenu);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      controlsWrapper.dispose();
      controlsRef.current = null;
      labelsRef.current = [];
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      labels.forEach((l) => {
        l.material.map.dispose();
        l.material.dispose();
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [mountNode, roomsKey]);

  const handleSelectRoom = (room) => {
    setSelectedId(room.id);
    if (controlsRef.current) {
      const c = centerRef.current || { x: 0, z: 0 };
      controlsRef.current.focus(room.x - c.x, room.z - c.z);
    }
  };

  const handleToggleViewMode = (topDown) => {
    setIsTopDown(topDown);
    if (controlsRef.current) {
      controlsRef.current.setTopDown(topDown);
    }
  };

  const selectedRoomData = useMemo(
    () => normalizedRooms.find((r) => r.id === selectedId),
    [normalizedRooms, selectedId]
  );

  if (activeFloorPlan?.url && (isPdfPlan || analysisStatus === 'unsupported_pdf')) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 border border-slate-300/50 dark:border-slate-800">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:bg-red-500/20">
          <FiFileText className="h-8 w-8" />
        </div>
        <h4 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">
          Architectural PDF Floor Plan Attached
        </h4>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          Automated 3D room extraction is not supported for raw PDF documents. You can inspect or download the original high-resolution architectural plan below.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a
            href={activeFloorPlan.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition"
          >
            <FiExternalLink className="h-3.5 w-3.5" />
            View PDF Document
          </a>
          <a
            href={activeFloorPlan.url}
            download
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <FiDownload className="h-3.5 w-3.5" />
            Download Plan
          </a>
        </div>
      </div>
    );
  }

  if (activeFloorPlan?.url && (analysisStatus === 'failed' || canonicalLayout?.status === 'failed')) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 border border-amber-300/40 dark:border-amber-800/40">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5">
          <FiAlertTriangle className="h-8 w-8" />
        </div>
        <h4 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">
          Floor plan analysis could not extract room boundaries
        </h4>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {analysisError || canonicalLayout?.error || 'The uploaded floor plan could not be processed to extract spatial boundaries and room placements. Procedural layout has not been fabricated to avoid misrepresenting the property.'}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => triggerAnalysis(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition"
          >
            <FiRefreshCw className="h-3.5 w-3.5" />
            Retry Analysis
          </button>
          <a
            href={activeFloorPlan.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <FiExternalLink className="h-3.5 w-3.5" />
            View Uploaded Plan
          </a>
        </div>
      </div>
    );
  }

  if (activeFloorPlan?.url && analysisStatus === 'analyzing') {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950">
        <FiRefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
        <h4 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
          Analyzing floor plan & generating 3D model...
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Extracting architectural room boundaries and spatial adjacencies
        </p>
      </div>
    );
  }

  if (!normalizedRooms.length) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-slate-500 text-sm">
        No room dimensions available to generate 3D model.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950">
      <div
        ref={handleMountRef}
        className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />

      {canonicalLayout?.source === 'floor_plan' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-50/95 px-3 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-700/50 dark:bg-emerald-950/90 dark:text-emerald-300"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Architectural 3D · Floor-plan derived ({normalizedRooms.length} rooms)</span>
        </motion.div>
      )}
      {canonicalLayout?.source === 'procedural' && !activeFloorPlan?.url && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-slate-300/40 bg-slate-50/95 px-3 py-1 text-[11px] font-medium text-slate-800 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span>
            {isLand
              ? '3D Plot Boundary · Indicative land area'
              : isCommercial
              ? '3D Commercial Space · Indicative floor layout'
              : `Estimated 3D Model · Indicative layout (${normalizedRooms.length} rooms)`}
          </span>
        </motion.div>
      )}

      {/* Top Controls Bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2"
      >
        {/* View Mode Segmented Control: 3D View vs Floor Plan View */}
        <div className="pointer-events-auto inline-flex rounded-full border border-slate-200 bg-white/95 p-0.5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleToggleViewMode(false)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              !isTopDown
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            3D View
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleToggleViewMode(true)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              isTopDown
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Floor Plan View
          </motion.button>
        </div>

        {/* Read-Only Furnishing Status Indicator */}
        <div
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
          title={`Property Furnishing: ${furnishingMode}`}
        >
          <span className="text-sm">
            {furnishingMode === 'unfurnished' ? '🏢' : furnishingMode === 'semi-furnished' ? '🪑' : '🛋️'}
          </span>
          <span className="capitalize">
            {furnishingMode === 'unfurnished' ? 'Unfurnished' : furnishingMode === 'semi-furnished' ? 'Semi-Furnished' : 'Furnished'}
          </span>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowNames((v) => !v)}
          className="pointer-events-auto rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
        >
          {showNames ? 'Hide Labels' : 'Show Labels'}
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setIsTopDown(false);
            controlsRef.current?.reset();
            setSelectedId('');
          }}
          className="pointer-events-auto rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
        >
          Reset View
        </motion.button>
      </motion.div>

      {/* Zoom In / Out Buttons */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="pointer-events-none absolute bottom-16 right-3 z-10 flex flex-col gap-2"
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => controlsRef.current?.zoomIn()}
          aria-label="Zoom in"
          title="Zoom in"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl font-bold leading-none text-slate-900 shadow-md transition hover:bg-white active:scale-95 dark:border-slate-700 dark:bg-slate-900/95 dark:text-white"
        >
          +
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => controlsRef.current?.zoomOut()}
          aria-label="Zoom out"
          title="Zoom out"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl font-bold leading-none text-slate-900 shadow-md transition hover:bg-white active:scale-95 dark:border-slate-700 dark:bg-slate-900/95 dark:text-white"
        >
          −
        </motion.button>
      </motion.div>

      {/* Selected Room Detail Card */}
      <AnimatePresence>
        {selectedRoomData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute left-3 top-16 z-10 flex items-center gap-3 rounded-xl border border-primary/20 bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-slate-900/95"
          >
            <span className="text-2xl">
              {ROOM_PALETTES[selectedRoomData.type]?.icon || '🏠'}
            </span>
            <div>
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {selectedRoomData.name}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {Math.round(selectedRoomData.lFt)} × {Math.round(selectedRoomData.wFt)} ft ·{' '}
                {Math.round(selectedRoomData.lFt * selectedRoomData.wFt)} sq. ft.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId('')}
              className="ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-base"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Room Selector Pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex items-center gap-1.5 overflow-x-auto pb-1"
      >
        {normalizedRooms.map((room) => {
          const isSelected = selectedId === room.id;
          const pal = ROOM_PALETTES[room.type] || ROOM_PALETTES.other;
          return (
            <motion.button
              type="button"
              key={room.id}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectRoom(room)}
              className={`pointer-events-auto flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                isSelected
                  ? 'bg-primary text-white shadow-md'
                  : 'border border-slate-200 bg-white/95 text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200'
              }`}
            >
              <span>{pal.icon}</span>
              <span>{room.name}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
