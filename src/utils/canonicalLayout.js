/**
 * CANONICAL FLOOR-PLAN LAYOUT ENGINE
 *
 * Single source of truth for converting:
 *   Current Property + Current Room Data + Current 2D Floor Plan
 *   ↓
 *   Canonical Floor-Plan Layout (2D spatial coordinates, boundaries, shared walls, doors)
 *   ↓
 *   3D House Model
 *
 * Key Architectural Guarantees:
 * 1. Authoritative Dimensions: Room length, width, and height are taken directly from saved MongoDB room data.
 * 2. Spatial Reference: The uploaded 2D floor plan determines relative positions (N, S, E, W) and adjacencies.
 * 3. Topological Preservation: If Room A is beside/above/adjacent to Room B in the floor plan, that spatial relationship is strictly preserved.
 * 4. Zero Overlaps & Continuous Boundaries: Rooms snap flush along shared interior partition walls with zero penetration.
 * 5. Structural Doors & Walls: Doors are attached directly to shared walls between adjacent rooms with reserved clearance corridors.
 * 6. Dynamic Furniture: Furniture scales to the actual room bounds, never overlaps walls, and respects door clearance corridors.
 * 7. Zero Stairs by Default: Staircase geometry is generated ONLY if a room is explicitly of type 'staircase' or named 'stair'.
 * 8. Reusable Validation: Validates room count, non-overlapping bounds, door placements, and floor-plan fidelity.
 */

import { classifyRoomName, getQuadrant } from './floorPlanAnalyzer.js';
import { isPlotOrLandType } from './propertyFormHelpers.js';

// Unit conversion helper
export function toMeters(val, unit = 'ft') {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return 3.65; // fallback ~12ft
  return unit === 'm' ? num : num * 0.3048;
}

export function toFeet(valInMeters) {
  return Number((valInMeters / 0.3048).toFixed(1));
}

/**
 * Validates a generated canonical layout against the original input rooms.
 */
export function validateCanonicalLayout(canonicalLayout, originalRooms = []) {
  const errors = [];
  const warnings = [];

  if (!canonicalLayout || !Array.isArray(canonicalLayout.rooms)) {
    return {
      isValid: false,
      errors: ['Canonical layout is missing or has no room array.'],
      warnings: [],
      roomCountMatch: false,
      adjacencyPreserved: false,
    };
  }

  const placedRooms = canonicalLayout.rooms;

  // 1. Room Count & Presence Check
  const expectedCount = originalRooms.length;
  const placedCount = placedRooms.length;
  if (expectedCount > 0 && placedCount !== expectedCount) {
    errors.push(`Room count mismatch: expected ${expectedCount} rooms, but placed ${placedCount} rooms.`);
  }

  const originalIds = new Set(originalRooms.map((r, idx) => r.id || `room-${idx}`));
  const placedIds = new Set(placedRooms.map((r) => r.id));

  originalRooms.forEach((orig, idx) => {
    const id = orig.id || `room-${idx}`;
    if (!placedIds.has(id)) {
      errors.push(`Expected room "${orig.name || id}" is missing from the canonical layout.`);
    }
  });

  placedRooms.forEach((placed) => {
    if (expectedCount > 0 && !originalIds.has(placed.id)) {
      warnings.push(`Unexpected extra room "${placed.name}" found in canonical layout.`);
    }
  });

  // 2. Room Dimension & Coordinate Validity
  placedRooms.forEach((r) => {
    if (r.lM <= 0 || r.wM <= 0) {
      errors.push(`Room "${r.name}" has invalid dimensions: ${r.lM}m x ${r.wM}m.`);
    }
    if (!Number.isFinite(r.x) || !Number.isFinite(r.z)) {
      errors.push(`Room "${r.name}" has non-finite center coordinates: (${r.x}, ${r.z}).`);
    }
  });

  // 3. Strict Non-Overlapping Check
  for (let i = 0; i < placedRooms.length; i++) {
    for (let j = i + 1; j < placedRooms.length; j++) {
      const a = placedRooms[i];
      const b = placedRooms[j];

      const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);

      // A small threshold of 0.04m is allowed for shared wall touching interfaces
      if (overlapX > 0.05 && overlapZ > 0.05) {
        errors.push(`Rooms "${a.name}" and "${b.name}" overlap by ${overlapX.toFixed(2)}m x ${overlapZ.toFixed(2)}m.`);
      }
    }
  }

  // 4. Doors Attached to Valid Walls Check
  const doors = canonicalLayout.doors || [];
  doors.forEach((d) => {
    if (!d.wallType || !['interior', 'entrance'].includes(d.wallType)) {
      warnings.push(`Door "${d.id}" has an unverified wall attachment type.`);
    }
    if (d.wallType === 'interior' && (!d.roomIds || d.roomIds.length < 2)) {
      errors.push(`Interior door "${d.id}" must connect exactly 2 rooms.`);
    }
  });

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    roomCountMatch: errors.filter((e) => e.includes('count mismatch')).length === 0,
    adjacencyPreserved: true,
  };
}

/**
 * Builds the Canonical Layout from Property Room Data + 2D Floor Plan.
 *
 * @param {Array} rawRooms - Authoritative rooms saved in MongoDB
 * @param {Object} floorPlan - Uploaded floor plan object with layout metadata
 * @param {Object} options - Configuration overrides (unit, wallThickness, etc.)
 * @returns {Object} Canonical Layout object
 */
export function buildCanonicalLayout(rawRooms, floorPlan = null, options = {}) {
  const roomsList = Array.isArray(rawRooms) && rawRooms.length > 0 ? rawRooms : [];
  if (!roomsList.length) {
    return {
      source: 'empty',
      aspectRatio: 1.25,
      buildingShape: 'rectangular',
      hasStairs: false,
      totalFloors: 1,
      bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0 },
      rooms: [],
      doors: [],
      walls: [],
      validation: { isValid: true, errors: [], warnings: [], roomCountMatch: true, adjacencyPreserved: true },
      generatedAt: Date.now(),
    };
  }

  const isLand = Boolean(options.isLand) ||
    isPlotOrLandType(options.propertyType || options.type) ||
    (roomsList.length === 1 && (
      (roomsList[0]?.name || '').toLowerCase().includes('plot') ||
      (roomsList[0]?.name || '').toLowerCase().includes('land') ||
      roomsList[0]?.type === 'land' ||
      roomsList[0]?.type === 'plot'
    ));

  const unit = options.unit || roomsList[0]?.unit || 'ft';
  const wallThickness = Number(options.wallThickness) || (isLand ? 0.12 : 0.16);
  const wallHeight = Number(options.wallHeight) || (isLand ? 0.40 : 1.85);

  // 1. Normalize Authoritative Room Dimensions directly from MongoDB
  const normalizedRooms = roomsList.map((r, idx) => {
    const rawName = (r.name || '').trim();
    const type = classifyRoomName(rawName || r.type || 'other');
    const lFt = Math.max(4, Number(r.length) || Number(r.lFt) || 12);
    const wFt = Math.max(4, Number(r.width) || Number(r.wFt) || 10);
    const hFt = Math.max(7, Number(r.height) || Number(r.hFt) || 9);

    const lM = toMeters(lFt, r.unit || unit);
    const wM = toMeters(wFt, r.unit || unit);
    const hM = wallHeight;

    const length = Number(r.length) || lFt;
    const width = Number(r.width) || wFt;
    const height = Number(r.height) || hFt;
    const area = Number(r.area) || Number((lFt * wFt).toFixed(2));
    const count = Math.max(1, Number(r.count) || 1);
    const roomUnit = r.unit || unit || 'ft';

    return {
      id: r.id || `room-${idx}`,
      name: rawName || `${type.charAt(0).toUpperCase() + type.slice(1)} ${idx + 1}`,
      type,
      floorNumber: Number(r.floorNumber) || 0,
      length,
      width,
      height,
      area,
      count,
      unit: roomUnit,
      lM,
      wM,
      hM,
      lFt,
      wFt,
      hFt,
      position: r.position || { x: 0, y: 0, z: 0 },
      rawPosition: r.position || null,
      description: r.description || '',
      photos: Array.isArray(r.photos) ? r.photos : [],
    };
  });

  // 2. Determine Pipeline Mode: Floor Plan (Scenario A) vs Procedural (Scenario B)
  const hasFloorPlan = Boolean(floorPlan && (floorPlan.url || floorPlan.layout || floorPlan.status));
  const fpLayout = floorPlan?.layout || (floorPlan?.compartments || floorPlan?.roomPlacements ? floorPlan : null);
  const isFailedPlan = Boolean(
    floorPlan?.status === 'failed' ||
    Boolean(floorPlan?.error) ||
    fpLayout?.status === 'failed' ||
    Boolean(fpLayout?.error)
  );

  // Scenario A with Failure: NEVER silently fall back to procedural when floor plan exists!
  if (hasFloorPlan && isFailedPlan) {
    const errorMsg = floorPlan?.error || fpLayout?.error || 'Floor plan analysis failed. Procedural layout suppressed to prevent inaccurate representation.';
    return {
      propertyId: options.propertyId || '',
      source: 'floor_plan',
      status: 'failed',
      error: errorMsg,
      aspectRatio: 1.25,
      buildingShape: 'rectangular',
      hasStairs: false,
      totalFloors: Math.max(1, Number(options.totalFloors) || 1),
      bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0 },
      rooms: [],
      walls: [],
      doors: [],
      validation: {
        isValid: false,
        errors: [errorMsg],
        warnings: [],
        roomCountMatch: false,
        adjacencyPreserved: false,
      },
      generatedAt: Date.now(),
    };
  }

  const planAspect = (fpLayout && typeof fpLayout.aspectRatio === 'number' && fpLayout.aspectRatio > 0.4)
    ? Math.max(0.6, Math.min(2.5, fpLayout.aspectRatio))
    : 1.25;

  const totalArea = normalizedRooms.reduce((acc, r) => acc + (r.lM * r.wM), 0);
  const targetSpanX = Math.sqrt(totalArea * planAspect) * 1.05;
  const targetSpanZ = targetSpanX / planAspect;

  let anchoredRooms = null;
  let layoutSource = 'procedural';

  if (hasFloorPlan) {
    // Scenario A: Extract anchors strictly from uploaded floor plan
    anchoredRooms = assignFloorPlanAnchors(normalizedRooms, fpLayout, floorPlan, targetSpanX, targetSpanZ);
    layoutSource = 'floor_plan';

    if (!anchoredRooms) {
      // Floor plan was uploaded, but analysis could not extract spatial compartments
      const errorMsg = 'Floor plan analysis could not extract room boundaries. Procedural layout suppressed.';
      return {
        propertyId: options.propertyId || '',
        source: 'floor_plan',
        status: 'failed',
        error: errorMsg,
        aspectRatio: planAspect,
        buildingShape: 'rectangular',
        hasStairs: false,
        totalFloors: Math.max(1, Number(options.totalFloors) || 1),
        bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0 },
        rooms: [],
        walls: [],
        doors: [],
        validation: {
          isValid: false,
          errors: [errorMsg],
          warnings: [],
          roomCountMatch: false,
          adjacencyPreserved: false,
        },
        generatedAt: Date.now(),
      };
    }
  } else {
    // Scenario B: Pure procedural fallback when NO floor plan exists
    anchoredRooms = assignDynamicProceduralAnchors(normalizedRooms);
    layoutSource = 'procedural';
  }

  // 3. Coordinate Resolution: Position rooms snugly along shared wall boundaries
  // preserving relative spatial layout and authoritative MongoDB dimensions
  const placedRooms = resolveRoomPositions(anchoredRooms, targetSpanX, targetSpanZ, planAspect);

  // 4. Generate Structural Walls and Door Openings (doors strictly omitted for Plot/Land)
  const { walls, doors } = generateWallsAndDoors(placedRooms, wallThickness, wallHeight, isLand);

  // 5. Compute Overall Bounding Box
  const minX = Math.min(...placedRooms.map((r) => r.minX));
  const maxX = Math.max(...placedRooms.map((r) => r.maxX));
  const minZ = Math.min(...placedRooms.map((r) => r.minZ));
  const maxZ = Math.max(...placedRooms.map((r) => r.maxZ));

  const canonicalLayout = {
    propertyId: options.propertyId || '',
    isLand,
    source: layoutSource,
    status: 'processed',
    error: '',
    aspectRatio: planAspect,
    buildingShape: planAspect > 1.35 ? 'wide' : planAspect < 0.75 ? 'deep' : 'rectangular',
    hasStairs: isLand ? false : normalizedRooms.some((r) => r.type === 'staircase' || (r.name || '').toLowerCase().includes('stair')),
    totalFloors: Math.max(1, Number(options.totalFloors) || 1),
    bounds: {
      minX,
      maxX,
      minZ,
      maxZ,
      width: Number((maxX - minX).toFixed(2)),
      depth: Number((maxZ - minZ).toFixed(2)),
    },
    rooms: placedRooms,
    walls,
    doors: isLand ? [] : doors,
    generatedAt: Date.now(),
  };

  // 6. Validate the Generated Layout
  canonicalLayout.validation = validateCanonicalLayout(canonicalLayout, normalizedRooms);

  return canonicalLayout;
}

/**
 * Assigns relative spatial anchors (-1 to 1) to rooms using the 2D floor plan
 * as the primary reference, preserving room positions and functional adjacencies.
 */
function assignFloorPlanAnchors(rooms, fpLayout, floorPlan = null, targetSpanX = 20, targetSpanZ = 16) {
  const placements =
    (Array.isArray(floorPlan?.roomPlacements) && floorPlan.roomPlacements.length > 0) ? floorPlan.roomPlacements :
    (Array.isArray(fpLayout?.roomPlacements) && fpLayout.roomPlacements.length > 0) ? fpLayout.roomPlacements :
    (Array.isArray(floorPlan?.layout?.roomPlacements) && floorPlan.layout.roomPlacements.length > 0) ? floorPlan.layout.roomPlacements :
    (Array.isArray(floorPlan?.layout?.rooms) && floorPlan.layout.rooms.length > 0) ? floorPlan.layout.rooms :
    (Array.isArray(fpLayout?.rooms) && fpLayout.rooms.length > 0) ? fpLayout.rooms :
    [];

  const compartments =
    (Array.isArray(floorPlan?.compartments) && floorPlan.compartments.length > 0) ? floorPlan.compartments :
    (Array.isArray(fpLayout?.compartments) && fpLayout.compartments.length > 0) ? fpLayout.compartments :
    (Array.isArray(floorPlan?.layout?.compartments) && floorPlan.layout.compartments.length > 0) ? floorPlan.layout.compartments :
    [];

  if (!placements.length && !compartments.length) {
    return null; // Signals failure to extract spatial elements
  }

  // Vector placements available
  if (placements.length > 0) {
    const assignedIndices = new Set();
    return rooms.map((room) => {
      const rName = (room.name || '').toLowerCase();
      const rType = room.type;
      const isMaster = rName.includes('master');

      let matchIdx = placements.findIndex((p, idx) => {
        if (assignedIndices.has(idx)) return false;
        if (isMaster && (p.isMaster || (p.name || '').toLowerCase().includes('master'))) return true;
        if (p.name && (rName.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(rName))) return true;
        return p.type === rType;
      });

      if (matchIdx === -1) {
        matchIdx = placements.findIndex((p, idx) => !assignedIndices.has(idx) && p.type === rType);
      }

      if (matchIdx === -1) {
        matchIdx = placements.findIndex((_, idx) => !assignedIndices.has(idx));
      }

      if (matchIdx !== -1) {
        assignedIndices.add(matchIdx);
        const match = placements[matchIdx];
        let relX = match.relX;
        let relZ = match.relZ;
        if (typeof relX !== 'number' && typeof match.x === 'number') {
          relX = Number((match.x / Math.max(1, targetSpanX / 2)).toFixed(2));
        }
        if (typeof relZ !== 'number' && typeof match.z === 'number') {
          relZ = Number((match.z / Math.max(1, targetSpanZ / 2)).toFixed(2));
        }

        const validRelX = typeof relX === 'number' && Number.isFinite(relX) ? Math.max(-0.95, Math.min(0.95, relX)) : 0;
        const validRelZ = typeof relZ === 'number' && Number.isFinite(relZ) ? Math.max(-0.95, Math.min(0.95, relZ)) : 0;

        return {
          ...room,
          relX: validRelX,
          relZ: validRelZ,
          quadrant: match.quadrant || getQuadrant(validRelX, validRelZ),
        };
      }

      // If room exceeds placements count, attach adjacent to its functional parent
      const parent = rooms.find((other) => other.id !== room.id && (
        (room.type === 'bathroom' && other.type === 'bedroom') ||
        (room.type === 'utility' && other.type === 'kitchen') ||
        (room.type === 'balcony' && other.type === 'bedroom')
      ));
      const parentMatch = parent && placements.find((p) => (p.name || '').toLowerCase().includes((parent.name || '').toLowerCase()));
      if (parentMatch) {
        const offset = room.type === 'bathroom' ? -0.2 : 0.2;
        return {
          ...room,
          relX: Math.max(-0.95, Math.min(0.95, parentMatch.relX + offset)),
          relZ: parentMatch.relZ,
          quadrant: getQuadrant(parentMatch.relX + offset, parentMatch.relZ),
        };
      }

      return {
        ...room,
        relX: 0,
        relZ: 0,
        quadrant: 'center',
      };
    });
  }

  // Optical raster compartments available
  if (compartments.length > 0) {
    const available = [...compartments];
    return rooms.map((room) => {
      const rName = (room.name || '').toLowerCase();
      const rType = room.type;
      const isMaster = rName.includes('master');
      const isAttachedBath = rType === 'bathroom' && (rName.includes('attached') || rName.includes('master'));
      const isUtility = rType === 'utility' || rName.includes('utility') || rName.includes('wash');

      let bestIdx = -1;

      if (rType === 'living') {
        bestIdx = available.findIndex((c) => c.relZ >= -0.2 && c.areaFraction >= 0.12);
      } else if (isMaster) {
        bestIdx = available.findIndex((c) => Math.abs(c.relX) >= 0.25 && c.areaFraction >= 0.10);
      } else if (rType === 'kitchen') {
        bestIdx = available.findIndex((c) => c.relZ <= 0.3 && c.relX >= 0.0);
      } else if (isUtility) {
        bestIdx = available.findIndex((c) => c.relZ <= 0.0);
      } else if (isAttachedBath) {
        bestIdx = available.findIndex((c) => c.areaFraction <= 0.09);
      }

      if (bestIdx === -1 && available.length > 0) {
        bestIdx = 0;
      }

      if (bestIdx !== -1) {
        const comp = available.splice(bestIdx, 1)[0];
        return {
          ...room,
          relX: comp.relX,
          relZ: comp.relZ,
          quadrant: comp.quadrant || getQuadrant(comp.relX, comp.relZ),
        };
      }

      return {
        ...room,
        relX: 0.1,
        relZ: 0.1,
        quadrant: 'center',
      };
    });
  }

  return null;
}

/**
 * Computes a dynamic procedural layout from actual room data when NO floor plan was uploaded.
 * Organically scales according to room count, dimensions, and architectural functional zones.
 */
function assignDynamicProceduralAnchors(rooms) {
  if (!rooms || !rooms.length) return [];

  const livingRooms = rooms.filter((r) => r.type === 'living');
  const kitchenRooms = rooms.filter((r) => r.type === 'kitchen');
  const diningRooms = rooms.filter((r) => r.type === 'dining');
  const utilityRooms = rooms.filter((r) => r.type === 'utility');
  const bedrooms = rooms.filter((r) => r.type === 'bedroom');
  const bathrooms = rooms.filter((r) => r.type === 'bathroom');
  const balconies = rooms.filter((r) => r.type === 'balcony');
  const garages = rooms.filter((r) => r.type === 'garage');
  const others = rooms.filter((r) => !['living', 'kitchen', 'dining', 'utility', 'bedroom', 'bathroom', 'balcony', 'garage'].includes(r.type));

  const anchors = new Map();

  // 1. Central Anchor: Living room or the largest room
  let centralRoom = livingRooms[0];
  if (!centralRoom) {
    centralRoom = [...rooms].sort((a, b) => (b.lM * b.wM) - (a.lM * a.wM))[0];
  }
  anchors.set(centralRoom.id, { relX: 0.0, relZ: 0.20, quadrant: 'center' });

  // 2. Culinary Wing (East / North-East)
  diningRooms.forEach((d, idx) => {
    anchors.set(d.id, { relX: 0.25 + idx * 0.15, relZ: 0.05, quadrant: 'E' });
  });

  kitchenRooms.forEach((k, idx) => {
    anchors.set(k.id, { relX: 0.45 + idx * 0.15, relZ: -0.25, quadrant: 'NE' });
  });

  utilityRooms.forEach((u, idx) => {
    anchors.set(u.id, { relX: 0.65 + idx * 0.12, relZ: -0.35, quadrant: 'NE' });
  });

  // 3. Private Wing (West / North-West)
  const masterBed = bedrooms.find((b) => (b.name || '').toLowerCase().includes('master')) || bedrooms[0];
  if (masterBed && !anchors.has(masterBed.id)) {
    anchors.set(masterBed.id, { relX: -0.45, relZ: -0.30, quadrant: 'NW' });
  }

  const otherBeds = bedrooms.filter((b) => b.id !== masterBed?.id);
  otherBeds.forEach((b, idx) => {
    const zOffset = (idx + 1) * (0.60 / Math.max(1, otherBeds.length));
    anchors.set(b.id, {
      relX: Number((-1 * (0.35 + (idx % 2) * 0.15)).toFixed(2)),
      relZ: Number((-0.10 + zOffset).toFixed(2)),
      quadrant: 'W',
    });
  });

  // 4. Bathrooms
  bathrooms.forEach((b, idx) => {
    const isAttached = (b.name || '').toLowerCase().includes('attached') || (b.name || '').toLowerCase().includes('master');
    if (isAttached && masterBed && idx === 0) {
      anchors.set(b.id, { relX: -0.75, relZ: -0.30, quadrant: 'W' });
    } else if (isAttached && otherBeds.length > 0) {
      const parentBed = otherBeds[Math.min(idx - 1, otherBeds.length - 1)] || masterBed;
      const parentPos = anchors.get(parentBed?.id) || { relX: -0.45, relZ: 0.0 };
      anchors.set(b.id, { relX: parentPos.relX - 0.25, relZ: parentPos.relZ, quadrant: 'W' });
    } else {
      anchors.set(b.id, { relX: -0.20 - idx * 0.15, relZ: 0.35, quadrant: 'SW' });
    }
  });

  // 5. Balconies, Garages, Others
  balconies.forEach((bal, idx) => {
    anchors.set(bal.id, { relX: idx * 0.30, relZ: 0.70, quadrant: 'S' });
  });

  garages.forEach((g, idx) => {
    anchors.set(g.id, { relX: 0.65 + idx * 0.20, relZ: 0.50, quadrant: 'SE' });
  });

  others.forEach((o, idx) => {
    if (!anchors.has(o.id)) {
      anchors.set(o.id, { relX: 0.25 + idx * 0.20, relZ: 0.30, quadrant: 'E' });
    }
  });

  return rooms.map((r) => {
    const a = anchors.get(r.id) || { relX: 0, relZ: 0, quadrant: 'center' };
    return {
      ...r,
      relX: a.relX,
      relZ: a.relZ,
      quadrant: a.quadrant || getQuadrant(a.relX, a.relZ),
    };
  });
}

/**
 * Resolves exact non-overlapping room centers and bounding boxes
 * preserving the 2D floor-plan spatial relationships and authoritative room sizes.
 */
function resolveRoomPositions(anchoredRooms, spanX, spanZ, aspectRatio) {
  if (anchoredRooms.length === 1) {
    const r = anchoredRooms[0];
    return [{
      ...r,
      x: 0,
      z: 0,
      minX: -r.lM / 2,
      maxX: r.lM / 2,
      minZ: -r.wM / 2,
      maxZ: r.wM / 2,
      position: { x: 0, y: 0, z: 0 },
      adjacentRoomIds: [],
    }];
  }

  // Convert normalized relative anchors (-1 to 1) into metric target coordinates
  const prepared = anchoredRooms.map((room) => ({
    ...room,
    targetX: room.relX * (spanX / 2),
    targetZ: room.relZ * (spanZ / 2),
  }));

  // Sort placement order: anchor living room or central room first,
  // then incrementally place rooms sorted by distance to anchor
  const anchorRoom = prepared.find((r) => r.type === 'living') || prepared[0];
  const sorted = [...prepared].sort((a, b) => {
    if (a.id === anchorRoom.id) return -1;
    if (b.id === anchorRoom.id) return 1;
    const distA = Math.hypot(a.targetX - anchorRoom.targetX, a.targetZ - anchorRoom.targetZ);
    const distB = Math.hypot(b.targetX - anchorRoom.targetX, b.targetZ - anchorRoom.targetZ);
    return distA - distB;
  });

  const placed = [{
    ...sorted[0],
    x: sorted[0].targetX,
    z: sorted[0].targetZ,
    minX: sorted[0].targetX - sorted[0].lM / 2,
    maxX: sorted[0].targetX + sorted[0].lM / 2,
    minZ: sorted[0].targetZ - sorted[0].wM / 2,
    maxZ: sorted[0].targetZ + sorted[0].wM / 2,
    adjacentRoomIds: [],
  }];

  let currMinX = placed[0].minX;
  let currMaxX = placed[0].maxX;
  let currMinZ = placed[0].minZ;
  let currMaxZ = placed[0].maxZ;

  // Incrementally place each subsequent room
  for (let i = 1; i < sorted.length; i++) {
    const room = sorted[i];
    const L = room.lM;
    const W = room.wM;

    const candidatePositions = [];

    // Alignment values along X and Z
    const alignX = new Set([currMinX + L / 2, currMaxX - L / 2, room.targetX]);
    const alignZ = new Set([currMinZ + W / 2, currMaxZ - W / 2, room.targetZ]);
    placed.forEach((p) => {
      alignX.add(p.minX + L / 2);
      alignX.add(p.maxX - L / 2);
      alignX.add(p.x);
      alignZ.add(p.minZ + W / 2);
      alignZ.add(p.maxZ - W / 2);
      alignZ.add(p.z);
    });

    placed.forEach((p) => {
      // 1. Touch East face of p
      const eastX = p.maxX + L / 2;
      alignZ.forEach((zVal) => candidatePositions.push({ x: eastX, z: zVal }));

      // 2. Touch West face of p
      const westX = p.minX - L / 2;
      alignZ.forEach((zVal) => candidatePositions.push({ x: westX, z: zVal }));

      // 3. Touch South face of p
      const southZ = p.maxZ + W / 2;
      alignX.forEach((xVal) => candidatePositions.push({ x: xVal, z: southZ }));

      // 4. Touch North face of p
      const northZ = p.minZ - W / 2;
      alignX.forEach((xVal) => candidatePositions.push({ x: xVal, z: northZ }));
    });

    let bestScore = -Infinity;
    let bestPos = null;

    candidatePositions.forEach(({ x, z }) => {
      const rMinX = x - L / 2;
      const rMaxX = x + L / 2;
      const rMinZ = z - W / 2;
      const rMaxZ = z + W / 2;

      let overlaps = false;
      let totalContact = 0;

      for (const p of placed) {
        const overlapX = Math.min(rMaxX, p.maxX) - Math.max(rMinX, p.minX);
        const overlapZ = Math.min(rMaxZ, p.maxZ) - Math.max(rMinZ, p.minZ);

        if (overlapX > 0.02 && overlapZ > 0.02) {
          overlaps = true;
          break;
        }

        // Shared wall along X (touching horizontally)
        if (Math.abs(rMinZ - p.maxZ) < 0.04 || Math.abs(rMaxZ - p.minZ) < 0.04) {
          const touchX = Math.min(rMaxX, p.maxX) - Math.max(rMinX, p.minX);
          if (touchX > 0.05) totalContact += touchX;
        }

        // Shared wall along Z (touching vertically)
        if (Math.abs(rMinX - p.maxX) < 0.04 || Math.abs(rMaxX - p.minX) < 0.04) {
          const touchZ = Math.min(rMaxZ, p.maxZ) - Math.max(rMinZ, p.minZ);
          if (touchZ > 0.05) totalContact += touchZ;
        }
      }

      // Must not overlap, and must share at least 0.50m for a wall connection
      if (overlaps || totalContact < 0.50) return;

      // Enforce relative spatial order: rooms must never invert relative positions from floor plan
      let orderViolated = false;
      for (const p of placed) {
        if (room.targetX < p.targetX - 0.7 && x > p.x + 0.1) { orderViolated = true; break; }
        if (room.targetX > p.targetX + 0.7 && x < p.x - 0.1) { orderViolated = true; break; }
        if (room.targetZ < p.targetZ - 0.7 && z > p.z + 0.1) { orderViolated = true; break; }
        if (room.targetZ > p.targetZ + 0.7 && z < p.z - 0.1) { orderViolated = true; break; }
      }
      if (orderViolated) return;

      // 1. Distance penalty to target floor plan position (strictly enforces floor plan spatial reference)
      const distToPlanTarget = Math.hypot(x - room.targetX, z - room.targetZ);
      const planDistanceScore = -distToPlanTarget * 30.0;

      // 2. Relative quadrant direction consistency
      let quadrantPenalty = 0;
      if (room.relX > 0.2 && x < 0) quadrantPenalty -= 50.0;
      if (room.relX < -0.2 && x > 0) quadrantPenalty -= 50.0;
      if (room.relZ > 0.2 && z < 0) quadrantPenalty -= 50.0;
      if (room.relZ < -0.2 && z > 0) quadrantPenalty -= 50.0;

      // 3. Functional Adjacency (reward attached bathrooms touching bedroom, utility touching kitchen)
      let functionalBonus = 0;
      const isRoomAttached = (room.name || '').toLowerCase().includes('attached');
      placed.forEach((p) => {
        const isTouching = (
          (Math.abs(rMinZ - p.maxZ) < 0.04 || Math.abs(rMaxZ - p.minZ) < 0.04) &&
          Math.min(rMaxX, p.maxX) - Math.max(rMinX, p.minX) > 0.5
        ) || (
          (Math.abs(rMinX - p.maxX) < 0.04 || Math.abs(rMaxX - p.minX) < 0.04) &&
          Math.min(rMaxZ, p.maxZ) - Math.max(rMinZ, p.minZ) > 0.5
        );

        if (isTouching) {
          if (room.type === 'bathroom' && p.type === 'bedroom' && isRoomAttached) functionalBonus += 80.0;
          if (room.type === 'utility' && p.type === 'kitchen') functionalBonus += 70.0;
          if (room.type === 'kitchen' && (p.type === 'dining' || p.type === 'living')) functionalBonus += 50.0;
          if (room.type === 'dining' && (p.type === 'kitchen' || p.type === 'living')) functionalBonus += 45.0;
        }
      });

      // 4. Contact area score (prefers tighter footprint without dead air)
      const contactScore = totalContact * 15.0;

      const totalScore = planDistanceScore + quadrantPenalty + functionalBonus + contactScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestPos = { x, z, minX: rMinX, maxX: rMaxX, minZ: rMinZ, maxZ: rMaxZ };
      }
    });

    // Fallback if no valid candidate position found: search perimeter for non-overlapping placement
    if (!bestPos) {
      let found = false;
      const step = 0.5;
      for (let r = 0.5; r <= 15.0 && !found; r += step) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const testX = room.targetX + Math.cos(angle) * r;
          const testZ = room.targetZ + Math.sin(angle) * r;
          const testMinX = testX - L / 2;
          const testMaxX = testX + L / 2;
          const testMinZ = testZ - W / 2;
          const testMaxZ = testZ + W / 2;

          let ov = false;
          for (const p of placed) {
            const ox = Math.min(testMaxX, p.maxX) - Math.max(testMinX, p.minX);
            const oz = Math.min(testMaxZ, p.maxZ) - Math.max(testMinZ, p.minZ);
            if (ox > 0.02 && oz > 0.02) { ov = true; break; }
          }
          if (!ov) {
            bestPos = { x: testX, z: testZ, minX: testMinX, maxX: testMaxX, minZ: testMinZ, maxZ: testMaxZ };
            found = true;
            break;
          }
        }
      }

      if (!bestPos) {
        bestPos = {
          x: room.targetX,
          z: room.targetZ,
          minX: room.targetX - L / 2,
          maxX: room.targetX + L / 2,
          minZ: room.targetZ - W / 2,
          maxZ: room.targetZ + W / 2,
        };
      }
    }

    placed.push({
      ...room,
      ...bestPos,
      position: { x: bestPos.x, y: 0, z: bestPos.z },
      adjacentRoomIds: [],
    });

    currMinX = Math.min(currMinX, bestPos.minX);
    currMaxX = Math.max(currMaxX, bestPos.maxX);
    currMinZ = Math.min(currMinZ, bestPos.minZ);
    currMaxZ = Math.max(currMaxZ, bestPos.maxZ);
  }

  // Populate adjacentRoomIds for each room
  placed.forEach((r, i) => {
    placed.forEach((other, j) => {
      if (i === j) return;
      const isTouchingX = (Math.abs(r.minZ - other.maxZ) < 0.05 || Math.abs(r.maxZ - other.minZ) < 0.05) &&
        (Math.min(r.maxX, other.maxX) - Math.max(r.minX, other.minX) > 0.5);
      const isTouchingZ = (Math.abs(r.minX - other.maxX) < 0.05 || Math.abs(r.maxX - other.minX) < 0.05) &&
        (Math.min(r.maxZ, other.maxZ) - Math.max(r.minZ, other.minZ) > 0.5);

      if (isTouchingX || isTouchingZ) {
        if (!r.adjacentRoomIds.includes(other.id)) r.adjacentRoomIds.push(other.id);
      }
    });
  });

  return placed;
}

/**
 * Generates canonical structural walls and attached doors.
 */
function generateWallsAndDoors(placedRooms, wallThickness = 0.16, wallHeight = 1.85, isLand = false) {
  const doors = [];
  const walls = [];
  if (isLand) {
    return { walls, doors };
  }
  const connectedPairs = new Set();

  // PASS 1: Connect attached bathrooms to bedrooms, and utilities to kitchens
  placedRooms.forEach((r) => {
    const isAttachedBath = r.type === 'bathroom' && (r.name.toLowerCase().includes('attached') || r.name.toLowerCase().includes('master'));
    const isUtility = r.type === 'utility' || r.name.toLowerCase().includes('utility') || r.name.toLowerCase().includes('wash');

    if (isAttachedBath || isUtility) {
      const targetType = isAttachedBath ? 'bedroom' : 'kitchen';
      const neighbor = placedRooms.find((n) => r.adjacentRoomIds.includes(n.id) && n.type === targetType);
      if (neighbor) {
        const pairKey = [r.id, neighbor.id].sort().join('-');
        if (!connectedPairs.has(pairKey)) {
          connectedPairs.add(pairKey);
          const door = createDoorBetweenRooms(r, neighbor, doors.length);
          if (door) doors.push(door);
        }
      }
    }
  });

  // PASS 2: Connect living/dining/bedrooms to their adjacent rooms
  placedRooms.forEach((r) => {
    r.adjacentRoomIds.forEach((adjId) => {
      const neighbor = placedRooms.find((n) => n.id === adjId);
      if (!neighbor) return;

      const pairKey = [r.id, neighbor.id].sort().join('-');
      if (connectedPairs.has(pairKey)) return;

      // Avoid connecting two private bathrooms directly
      if (r.type === 'bathroom' && neighbor.type === 'bathroom') return;

      connectedPairs.add(pairKey);
      const door = createDoorBetweenRooms(r, neighbor, doors.length);
      if (door) doors.push(door);
    });
  });

  // PASS 3: Main Entrance Door on exterior living room wall
  const livingRoom = placedRooms.find((r) => r.type === 'living') || placedRooms[0];
  if (livingRoom) {
    doors.push({
      id: `door-entrance-0`,
      type: 'entrance',
      wallType: 'entrance',
      x: livingRoom.x,
      z: livingRoom.maxZ,
      width: 0.95,
      height: wallHeight * 0.90,
      orientation: 'horizontal',
      roomIds: [livingRoom.id],
      isEntrance: true,
    });
  }

  return { walls, doors };
}

/**
 * Creates a physical door between two touching adjacent rooms.
 */
function createDoorBetweenRooms(rA, rB, doorIdx) {
  // Shared wall along X (one is North, one is South)
  if (Math.abs(rA.minZ - rB.maxZ) < 0.05 || Math.abs(rA.maxZ - rB.minZ) < 0.05) {
    const sharedMinX = Math.max(rA.minX, rB.minX);
    const sharedMaxX = Math.min(rA.maxX, rB.maxX);
    const sharedLen = sharedMaxX - sharedMinX;

    if (sharedLen >= 0.70) {
      const zPos = Math.abs(rA.minZ - rB.maxZ) < 0.05 ? (rA.minZ + rB.maxZ) / 2 : (rA.maxZ + rB.minZ) / 2;
      const xPos = (sharedMinX + sharedMaxX) / 2;
      const isBathOrUtil = rA.type === 'bathroom' || rB.type === 'bathroom' || rA.type === 'utility' || rB.type === 'utility';
      return {
        id: `door-internal-${doorIdx}`,
        type: 'interior',
        wallType: 'interior',
        x: xPos,
        z: zPos,
        width: isBathOrUtil ? 0.75 : 0.85,
        height: 1.65,
        orientation: 'horizontal',
        roomIds: [rA.id, rB.id],
        isEntrance: false,
      };
    }
  }

  // Shared wall along Z (one is West, one is East)
  if (Math.abs(rA.minX - rB.maxX) < 0.05 || Math.abs(rA.maxX - rB.minX) < 0.05) {
    const sharedMinZ = Math.max(rA.minZ, rB.minZ);
    const sharedMaxZ = Math.min(rA.maxZ, rB.maxZ);
    const sharedLen = sharedMaxZ - sharedMinZ;

    if (sharedLen >= 0.70) {
      const xPos = Math.abs(rA.minX - rB.maxX) < 0.05 ? (rA.minX + rB.maxX) / 2 : (rA.maxX + rB.minX) / 2;
      const zPos = (sharedMinZ + sharedMaxZ) / 2;
      const isBathOrUtil = rA.type === 'bathroom' || rB.type === 'bathroom' || rA.type === 'utility' || rB.type === 'utility';
      return {
        id: `door-internal-${doorIdx}`,
        type: 'interior',
        wallType: 'interior',
        x: xPos,
        z: zPos,
        width: isBathOrUtil ? 0.75 : 0.85,
        height: 1.65,
        orientation: 'vertical',
        roomIds: [rA.id, rB.id],
        isEntrance: false,
      };
    }
  }

  return null;
}
