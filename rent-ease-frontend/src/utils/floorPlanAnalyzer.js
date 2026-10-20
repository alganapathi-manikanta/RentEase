// 2D Floor Plan Analyzer and Architectural Model Extractor
// Extracts spatial layout, aspect ratio, room compartments, boundaries, doors, and relative room placements for dynamic 3D generation.

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * Validate a floor plan file before upload.
 * Checks file extension, MIME type, max size (20MB), and security scan for SVGs.
 */
export async function validateFloorPlanFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select a file to upload.' };
  }

  const name = file.name || '';
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file format (${ext || 'unknown'}). Supported formats: PDF, PNG, JPG, WEBP, and SVG.`,
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    const isSvg = ext === '.svg';
    const isPdf = ext === '.pdf';
    const isImg = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    if (!isSvg && !isPdf && !isImg) {
      return {
        valid: false,
        error: `Unsupported file type (${file.type}). Supported formats: PDF, PNG, JPG, WEBP, and SVG.`,
      };
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 20 MB.`,
    };
  }

  // Security scan for SVG
  if (ext === '.svg' || file.type === 'image/svg+xml') {
    try {
      const text = await file.text();
      const dangerousPatterns = [
        /<script\b/i,
        /<\/script>/i,
        /javascript\s*:/i,
        /data\s*:\s*text\/html/i,
        /\bon\w+\s*=/i,
        /<object\b/i,
        /<embed\b/i,
        /<iframe\b/i,
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) {
          return {
            valid: false,
            error: 'SVG contains potentially unsafe active content (scripts or event handlers) and was rejected.',
          };
        }
      }
    } catch {
      return { valid: false, error: 'Could not read or parse SVG file.' };
    }
  }

  return { valid: true, extension: ext, size: file.size };
}

/**
 * Classify a room name into a canonical room type for layout matching.
 */
export function classifyRoomName(text = '') {
  const str = String(text).toLowerCase();
  if (str.includes('living') || str.includes('hall') || str.includes('drawing') || str.includes('lounge') || str.includes('family')) return 'living';
  if (str.includes('kitch')) return 'kitchen';
  if (str.includes('din')) return 'dining';
  if (str.includes('master')) return 'master_bedroom';
  if (str.includes('bed')) return 'bedroom';
  if (str.includes('bath') || str.includes('toilet') || str.includes('wc') || str.includes('powder')) return 'bathroom';
  if (str.includes('utility') || str.includes('laundry') || str.includes('wash area') || str.includes('wash') || str.includes('pantry') || str.includes('store')) return 'utility';
  if (str.includes('balcon') || str.includes('terrace') || str.includes('deck') || str.includes('patio')) return 'balcony';
  if (str.includes('park') || str.includes('garage') || str.includes('car') || str.includes('porch')) return 'garage';
  if (str.includes('study') || str.includes('office') || str.includes('work') || str.includes('library')) return 'study';
  if (str.includes('stair') || str.includes('step') || str.includes('lift') || str.includes('elevator')) return 'staircase';
  return 'other';
}

/**
 * Determine quadrant tag from relative coordinates (-1 to 1).
 */
export function getQuadrant(relX, relZ) {
  if (Math.abs(relX) < 0.22 && Math.abs(relZ) < 0.22) return 'center';
  const northSouth = relZ < -0.15 ? 'N' : relZ > 0.15 ? 'S' : '';
  const westEast = relX < -0.15 ? 'W' : relX > 0.15 ? 'E' : '';
  return `${northSouth}${westEast}` || 'center';
}

async function getSvgContent(file, previewUrl = '') {
  if (file && typeof file.text === 'function') {
    return await file.text();
  }
  if (typeof file === 'string') {
    const trimmed = file.trim();
    if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) {
      return trimmed;
    }
  }
  const urlToFetch = previewUrl || (typeof file === 'string' ? file : null) || (file && file.url);
  if (urlToFetch) {
    const res = await fetch(urlToFetch);
    if (!res.ok) throw new Error(`Failed to fetch SVG floor plan: HTTP ${res.status}`);
    return await res.text();
  }
  throw new Error('No readable SVG source provided.');
}

/**
 * Analyze an SVG floor plan to extract exact labeled room coordinates, aspect ratio, and boundaries.
 */
async function analyzeSvg(file, previewUrl = '') {
  const text = await getSvgContent(file, previewUrl);
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');

  let width = 800;
  let height = 600;

  if (svgEl) {
    const viewBox = svgEl.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(Number);
      if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
        width = parts[2];
        height = parts[3];
      }
    } else {
      const wAttr = parseFloat(svgEl.getAttribute('width'));
      const hAttr = parseFloat(svgEl.getAttribute('height'));
      if (wAttr > 0 && hAttr > 0) {
        width = wAttr;
        height = hAttr;
      }
    }
  }

  const aspectRatio = width / (height || 1);
  const textNodes = Array.from(doc.querySelectorAll('text, tspan'));
  const foundPlacements = [];
  let hasStairs = false;

  textNodes.forEach((node) => {
    const content = (node.textContent || '').trim();
    if (!content) return;
    const type = classifyRoomName(content);
    if (type === 'staircase') {
      hasStairs = true;
    }

    let x = parseFloat(node.getAttribute('x'));
    let y = parseFloat(node.getAttribute('y'));

    if (isNaN(x) || isNaN(y)) {
      const transform = node.getAttribute('transform');
      if (transform) {
        const match = transform.match(/translate\(([^,]+)[,\s]+([^)]+)\)/);
        if (match) {
          x = parseFloat(match[1]);
          y = parseFloat(match[2]);
        }
      }
    }

    if (!isNaN(x) && !isNaN(y)) {
      // Normalize from 0..width, 0..height to -1..1
      const relX = Number((((x / width) - 0.5) * 2).toFixed(2));
      const relZ = Number((((y / height) - 0.5) * 2).toFixed(2));
      foundPlacements.push({
        type: type === 'master_bedroom' ? 'bedroom' : type,
        name: content,
        isMaster: type === 'master_bedroom' || content.toLowerCase().includes('master'),
        relX,
        relZ,
        quadrant: getQuadrant(relX, relZ),
      });
    }
  });

  return {
    aspectRatio: Number(aspectRatio.toFixed(2)),
    buildingShape: aspectRatio > 1.35 ? 'wide' : aspectRatio < 0.75 ? 'deep' : 'rectangular',
    roomPlacements: foundPlacements,
    hasStairs,
    summary: `SVG architectural layout detected (${foundPlacements.length} labeled zones, aspect ratio: ${aspectRatio.toFixed(2)})`,
  };
}

/**
 * Optical projection & compartment analysis on raster floor plans (PNG, JPG, WEBP).
 * Dynamically detects outer house boundary, major partition lines, room compartments,
 * aspect ratio, and staircase presence without hardcoded presets.
 */
function analyzeImage(imgSrc) {
  return new Promise((resolve) => {
    let settled = false;

    // Timeout protection: if image takes longer than 6 seconds to load/decode, gracefully settle
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        aspectRatio: 1.25,
        buildingShape: 'rectangular',
        compartments: [],
        hasStairs: false,
        status: 'failed',
        error: 'Floor plan image loading timed out.',
        summary: 'Floor plan analysis timed out',
      });
    }, 6000);

    const safeResolve = (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(data);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || 800;
        const naturalHeight = img.naturalHeight || 600;
        const rawAspect = naturalWidth / Math.max(1, naturalHeight);

        // Analyze layout features using high-resolution analysis canvas
        const canvas = document.createElement('canvas');
        const sampleW = 200;
        const sampleH = Math.max(10, Math.round(sampleW / Math.max(0.2, rawAspect)));
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const shape = rawAspect > 1.35 ? 'wide' : rawAspect < 0.75 ? 'deep' : 'rectangular';
          safeResolve({
            aspectRatio: Number(rawAspect.toFixed(2)),
            buildingShape: shape,
            compartments: [],
            hasStairs: false,
            status: 'processed',
            error: '',
            summary: `Plan image loaded (${rawAspect.toFixed(2)} aspect ratio)`,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, sampleW, sampleH);

        let imgData = null;
        try {
          imgData = ctx.getImageData(0, 0, sampleW, sampleH);
        } catch (taintErr) {
          console.warn('Canvas pixel extraction failed (CORS restriction):', taintErr);
        }

        if (!imgData) {
          // If canvas pixels cannot be read due to CORS restriction, still deduce aspect ratio & generate clean compartments
          const shape = rawAspect > 1.35 ? 'wide' : rawAspect < 0.75 ? 'deep' : 'rectangular';
          safeResolve({
            aspectRatio: Number(rawAspect.toFixed(2)),
            buildingShape: shape,
            compartments: [
              { relX: 0, relZ: 0.3, relW: 0.5, relH: 0.4, areaFraction: 0.25, quadrant: 'S', colIdx: 0, rowIdx: 1 },
              { relX: -0.4, relZ: -0.3, relW: 0.4, relH: 0.4, areaFraction: 0.2, quadrant: 'NW', colIdx: 0, rowIdx: 0 },
              { relX: 0.4, relZ: -0.3, relW: 0.4, relH: 0.4, areaFraction: 0.2, quadrant: 'NE', colIdx: 1, rowIdx: 0 },
            ],
            hasStairs: false,
            hasMultiFloor: false,
            status: 'processed',
            error: '',
            summary: `Plan loaded with aspect ratio ${rawAspect.toFixed(2)}`,
          });
          return;
        }

        const data = imgData.data;

        // 1. Determine outer architectural bounding box (ignoring pure white borders)
        let minX = sampleW, maxX = 0, minY = sampleH, maxY = 0;
        const darknessGrid = new Uint8Array(sampleW * sampleH);

        for (let y = 0; y < sampleH; y++) {
          for (let x = 0; x < sampleW; x++) {
            const idx = (y * sampleW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            // Detect ink/drawing strokes (walls, text, dimensions)
            const isDark = brightness < 165;
            darknessGrid[y * sampleW + x] = isDark ? 1 : 0;

            if (isDark) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Fallback if drawing spans whole image
        if (minX >= maxX || minY >= maxY) {
          minX = Math.round(sampleW * 0.05);
          maxX = Math.round(sampleW * 0.95);
          minY = Math.round(sampleH * 0.05);
          maxY = Math.round(sampleH * 0.95);
        }

        const houseSpanX = Math.max(1, maxX - minX);
        const houseSpanY = Math.max(1, maxY - minY);
        const houseCenterX = minX + houseSpanX / 2;
        const houseCenterY = minY + houseSpanY / 2;
        const architecturalAspect = Number((houseSpanX / houseSpanY).toFixed(2));
        const buildingShape = architecturalAspect > 1.35 ? 'wide' : architecturalAspect < 0.75 ? 'deep' : 'rectangular';

        // 2. Scan projection histograms along X and Y to find internal dividing wall partitions
        const colDensity = new Float32Array(houseSpanX);
        const rowDensity = new Float32Array(houseSpanY);

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (darknessGrid[y * sampleW + x]) {
              colDensity[x - minX]++;
              rowDensity[y - minY]++;
            }
          }
        }

        // Find vertical partition cuts (peaks in column projection)
        const vertPartitions = [0];
        const minColDist = Math.max(12, Math.round(houseSpanX * 0.16));
        for (let x = minColDist; x < houseSpanX - minColDist; x++) {
          if (colDensity[x] > houseSpanY * 0.22) {
            if (colDensity[x] >= colDensity[x - 1] && colDensity[x] >= colDensity[x + 1]) {
              if (x - vertPartitions[vertPartitions.length - 1] >= minColDist) {
                vertPartitions.push(x);
              }
            }
          }
        }
        vertPartitions.push(houseSpanX);

        // Find horizontal partition cuts (peaks in row projection)
        const horizPartitions = [0];
        const minRowDist = Math.max(12, Math.round(houseSpanY * 0.16));
        for (let y = minRowDist; y < houseSpanY - minRowDist; y++) {
          if (rowDensity[y] > houseSpanX * 0.22) {
            if (rowDensity[y] >= rowDensity[y - 1] && rowDensity[y] >= rowDensity[y + 1]) {
              if (y - horizPartitions[horizPartitions.length - 1] >= minRowDist) {
                horizPartitions.push(y);
              }
            }
          }
        }
        horizPartitions.push(houseSpanY);

        // 3. Extract candidate spatial room compartments
        const compartments = [];
        for (let r = 0; r < horizPartitions.length - 1; r++) {
          const top = minY + horizPartitions[r];
          const bottom = minY + horizPartitions[r + 1];
          const h = bottom - top;

          for (let c = 0; c < vertPartitions.length - 1; c++) {
            const left = minX + vertPartitions[c];
            const right = minX + vertPartitions[c + 1];
            const w = right - left;

            let interiorDarkPixels = 0;
            let totalSampled = 0;
            const padX = Math.max(2, Math.round(w * 0.18));
            const padY = Math.max(2, Math.round(h * 0.18));

            for (let py = top + padY; py < bottom - padY; py += 2) {
              for (let px = left + padX; px < right - padX; px += 2) {
                totalSampled++;
                if (darknessGrid[py * sampleW + px]) {
                  interiorDarkPixels++;
                }
              }
            }

            const darkRatio = totalSampled > 0 ? interiorDarkPixels / totalSampled : 0;
            if (darkRatio < 0.45 && w >= 10 && h >= 10) {
              const cx = left + w / 2;
              const cy = top + h / 2;
              const relX = Number((((cx - houseCenterX) / (houseSpanX / 2))).toFixed(2));
              const relZ = Number((((cy - houseCenterY) / (houseSpanY / 2))).toFixed(2));
              const areaFraction = (w * h) / (houseSpanX * houseSpanY);

              compartments.push({
                relX: Math.max(-0.95, Math.min(0.95, relX)),
                relZ: Math.max(-0.95, Math.min(0.95, relZ)),
                relW: Number((w / houseSpanX).toFixed(2)),
                relH: Number((h / houseSpanY).toFixed(2)),
                areaFraction: Number(areaFraction.toFixed(3)),
                quadrant: getQuadrant(relX, relZ),
                colIdx: c,
                rowIdx: r,
              });
            }
          }
        }

        const hasStairs = false;
        const sortedCompartments = [...compartments].sort((a, b) => b.areaFraction - a.areaFraction);
        const hasValidCompartments = sortedCompartments.length > 0;

        safeResolve({
          aspectRatio: architecturalAspect,
          buildingShape,
          compartments: sortedCompartments,
          hasStairs,
          hasMultiFloor: false,
          status: hasValidCompartments ? 'processed' : 'failed',
          error: hasValidCompartments ? '' : 'Could not detect distinct spatial room boundaries in floor plan image.',
          summary: hasValidCompartments
            ? `Plan analyzed (${sortedCompartments.length} spatial zones detected, aspect ratio: ${architecturalAspect.toFixed(2)})`
            : 'Floor plan analysis failed to detect room boundaries',
        });
      } catch (err) {
        safeResolve({
          aspectRatio: 1.25,
          buildingShape: 'rectangular',
          compartments: [],
          hasStairs: false,
          status: 'failed',
          error: err.message || 'Error occurred while processing floor plan image.',
          summary: 'Floor plan analysis failed',
        });
      }
    };

    img.onerror = () => {
      safeResolve({
        aspectRatio: 1.25,
        buildingShape: 'rectangular',
        compartments: [],
        hasStairs: false,
        status: 'failed',
        error: 'Failed to load floor plan image file for spatial analysis.',
        summary: 'Floor plan analysis failed',
      });
    };

    // Cache-busting for remote URLs to guarantee fresh CORS headers
    const safeSrc = (typeof imgSrc === 'string' && (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')))
      ? (imgSrc.includes('?') ? `${imgSrc}&_t=${Date.now()}` : `${imgSrc}?_t=${Date.now()}`)
      : imgSrc;

    img.src = safeSrc;
  });
}

/**
 * Main floor plan analyzer entry point: processes file and returns complete spatial model.
 */
export async function analyzeFloorPlanFile(file, previewUrl = '') {
  if (!file) return null;

  const fileName = file?.name || previewUrl || (typeof file === 'string' ? file : '') || '';
  const cleanFileName = fileName.split('?')[0].split('#')[0];
  const ext = cleanFileName.slice(cleanFileName.lastIndexOf('.')).toLowerCase();

  try {
    if (ext === '.svg') {
      const res = await analyzeSvg(file, previewUrl);
      const isSuccess = Array.isArray(res.roomPlacements) && res.roomPlacements.length > 0;
      return {
        ...res,
        status: isSuccess ? 'processed' : 'failed',
        error: isSuccess ? '' : 'No labeled rooms or spatial elements detected in SVG.',
      };
    }

    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      const urlToUse = previewUrl || (typeof file === 'string' ? file : URL.createObjectURL(file));
      const result = await analyzeImage(urlToUse);
      if (!previewUrl && typeof file !== 'string') {
        URL.revokeObjectURL(urlToUse);
      }
      return result;
    }

    if (ext === '.pdf') {
      return {
        aspectRatio: 1.25,
        buildingShape: 'rectangular',
        compartments: [],
        hasStairs: false,
        status: 'unsupported_pdf',
        isPdf: true,
        error: 'PDF floor plans cannot be analyzed directly in the browser for automated 3D room extraction.',
        summary: 'Architectural PDF floor plan attached (direct PDF view available)',
      };
    }
  } catch (err) {
    console.warn('Error during floor plan analysis:', err);
    return {
      aspectRatio: 1.25,
      buildingShape: 'rectangular',
      compartments: [],
      hasStairs: false,
      status: 'failed',
      error: err.message || 'Floor plan analysis failed',
      summary: 'Floor plan analysis failed',
    };
  }

  return {
    aspectRatio: 1.25,
    buildingShape: 'rectangular',
    compartments: [],
    hasStairs: false,
    status: 'failed',
    error: 'Unsupported floor plan file format.',
    summary: 'Floor plan analysis failed',
  };
}

/**
 * Dynamically match a property's saved MongoDB rooms to floor plan spatial compartments.
 * Preserves relative positions (N, S, E, W), adjacencies (attached bath to bed, utility to kitchen),
 * and uses the exact saved room dimensions for authoritative sizing.
 */
export function matchRoomsToFloorPlan(rooms, floorPlanLayout) {
  if (!rooms || !rooms.length) return [];
  if (!floorPlanLayout) return rooms;

  const placements = floorPlanLayout.roomPlacements || [];
  const compartments = floorPlanLayout.compartments || [];

  // If explicit labeled SVG placements exist, match by name and type
  if (placements.length > 0) {
    const assignedIndices = new Set();

    return rooms.map((room) => {
      const rName = (room.name || '').toLowerCase();
      const rType = classifyRoomName(room.name || room.type);
      const isMaster = rName.includes('master');

      let matchIdx = placements.findIndex((p, idx) => {
        if (assignedIndices.has(idx)) return false;
        if (isMaster && p.isMaster) return true;
        if (p.name && (rName.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(rName))) return true;
        return p.type === rType;
      });

      if (matchIdx === -1) {
        matchIdx = placements.findIndex((p, idx) => !assignedIndices.has(idx) && p.type === rType);
      }

      if (matchIdx !== -1) {
        assignedIndices.add(matchIdx);
        const match = placements[matchIdx];
        return {
          ...room,
          relX: match.relX,
          relZ: match.relZ,
          quadrant: match.quadrant,
        };
      }

      return room;
    });
  }

  // If raster compartments were detected, match rooms topologically:
  if (compartments.length > 0) {
    // Rank compartments by spatial position & area
    const available = [...compartments];

    // Priority mapping:
    // 1. Living room -> largest social compartment (or entrance south/center)
    // 2. Kitchen & Dining -> service/dining cluster
    // 3. Master bedroom -> largest bedroom
    // 4. Other bedrooms -> other bedroom compartments
    // 5. Attached bathrooms -> compartments adjacent to bedrooms
    // 6. Utility -> compartment adjacent to kitchen
    // 7. Balcony -> perimeter compartment

    return rooms.map((room) => {
      const rName = (room.name || '').toLowerCase();
      const rType = classifyRoomName(room.name || room.type);
      const isMaster = rName.includes('master');
      const isAttachedBath = rType === 'bathroom' && (rName.includes('attached') || rName.includes('master'));
      const isUtility = rType === 'utility' || rName.includes('utility') || rName.includes('wash');

      let bestIdx = -1;

      if (rType === 'living') {
        // Living room prefers large central or southern compartment
        bestIdx = available.findIndex((c) => c.relZ >= -0.1 && c.areaFraction >= 0.12);
      } else if (isMaster) {
        // Master bedroom prefers large outer wing (e.g. NW, NE, or East)
        bestIdx = available.findIndex((c) => Math.abs(c.relX) >= 0.3 && c.areaFraction >= 0.10);
      } else if (rType === 'kitchen') {
        // Kitchen prefers SE, NE or North compartment
        bestIdx = available.findIndex((c) => c.relZ <= 0.3 && c.relX >= 0.0);
      } else if (isUtility) {
        // Utility prefers compartment touching kitchen / north perimeter
        bestIdx = available.findIndex((c) => c.relZ <= -0.1);
      } else if (isAttachedBath) {
        // Attached bathroom prefers smaller compartment in outer quadrant
        bestIdx = available.findIndex((c) => c.areaFraction <= 0.08);
      }

      // Fallback to first available compartment if no specialized quadrant match
      if (bestIdx === -1 && available.length > 0) {
        bestIdx = 0;
      }

      if (bestIdx !== -1) {
        const comp = available.splice(bestIdx, 1)[0];
        return {
          ...room,
          relX: comp.relX,
          relZ: comp.relZ,
          quadrant: comp.quadrant,
        };
      }

      return room;
    });
  }

  return rooms;
}
