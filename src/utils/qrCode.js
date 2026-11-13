/**
 * Lightweight ISO/IEC 18004 QR Code Generator (Byte Mode, EC Level L, Versions 2–4)
 * Pure JS, zero dependencies, CSP-'self' safe. Supports payloads up to 78 UTF-8 bytes.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildGeneratorPoly(ecCount) {
  let poly = [1];
  for (let i = 0; i < ecCount; i += 1) {
    const factor = [1, GF_EXP[i]];
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      for (let k = 0; k < factor.length; k += 1) {
        next[j + k] ^= gfMul(poly[j], factor[k]);
      }
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomonEc(dataBytes, ecCount) {
  const gen = buildGeneratorPoly(ecCount);
  const work = new Uint8Array(dataBytes.length + ecCount);
  work.set(dataBytes, 0);
  for (let i = 0; i < dataBytes.length; i += 1) {
    const coef = work[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j += 1) {
        work[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return Array.from(work.slice(dataBytes.length));
}

const VERSIONS_L = [
  { version: 2, size: 25, totalDataCw: 34, ecCw: 10, alignCenters: [6, 18] },
  { version: 3, size: 29, totalDataCw: 55, ecCw: 15, alignCenters: [6, 22] },
  { version: 4, size: 33, totalDataCw: 80, ecCw: 20, alignCenters: [6, 26] },
];

function encodeBytePayload(text, spec) {
  const bytes = new TextEncoder().encode(text);
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((val >>> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);

  const maxBits = spec.totalDataCw * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCw = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j += 1) byteVal = (byteVal << 1) | bits[i + j];
    dataCw.push(byteVal);
  }

  let padToggle = 0;
  while (dataCw.length < spec.totalDataCw) {
    dataCw.push(padToggle % 2 === 0 ? 0xec : 0x11);
    padToggle += 1;
  }

  const ecCw = computeReedSolomonEc(dataCw, spec.ecCw);
  const allBits = [];
  for (const cw of [...dataCw, ...ecCw]) {
    for (let i = 7; i >= 0; i -= 1) allBits.push((cw >>> i) & 1);
  }
  return allBits;
}

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function placeFinder(grid, isFunc, top, left) {
  const size = grid.length;
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = top + r;
      const cc = left + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const dark =
        inOuter &&
        (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      grid[rr][cc] = dark ? 1 : 0;
      isFunc[rr][cc] = true;
    }
  }
}

function placeAlignment(grid, isFunc, cr, cc) {
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      grid[cr + r][cc + c] = dark ? 1 : 0;
      isFunc[cr + r][cc + c] = true;
    }
  }
}

function computeFormatBitsL(maskId) {
  // EC Level L = 01 (bits 4..3), Mask = 0..7 (bits 2..0)
  const data = (0b01 << 3) | maskId;
  let rem = data << 10;
  const gen = 0x537;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >>> i) & 1) rem ^= gen << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function writeFormatInfo(grid, isFunc, maskId) {
  const size = grid.length;
  const bits = computeFormatBitsL(maskId);
  for (let i = 0; i < 15; i += 1) {
    const bit = (bits >>> i) & 1;
    // Strip A around top-left finder
    if (i < 6) {
      grid[8][i] = bit;
      isFunc[8][i] = true;
    } else if (i === 6) {
      grid[8][7] = bit;
      isFunc[8][7] = true;
    } else if (i === 7) {
      grid[8][8] = bit;
      isFunc[8][8] = true;
    } else if (i === 8) {
      grid[7][8] = bit;
      isFunc[7][8] = true;
    } else {
      grid[14 - i][8] = bit;
      isFunc[14 - i][8] = true;
    }

    // Strip B around bottom-left & top-right finders
    if (i < 8) {
      grid[8][size - 1 - i] = bit;
      isFunc[8][size - 1 - i] = true;
    } else {
      grid[size - 15 + i][8] = bit;
      isFunc[size - 15 + i][8] = true;
    }
  }
}

function scoreMaskPenalty(grid) {
  const n = grid.length;
  let penalty = 0;

  // Rule 1: Runs of >= 5 identical modules
  for (let r = 0; r < n; r += 1) {
    let runVal = grid[r][0];
    let runLen = 1;
    for (let c = 1; c < n; c += 1) {
      if (grid[r][c] === runVal) runLen += 1;
      else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runVal = grid[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < n; c += 1) {
    let runVal = grid[0][c];
    let runLen = 1;
    for (let r = 1; r < n; r += 1) {
      if (grid[r][c] === runVal) runLen += 1;
      else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runVal = grid[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Rule 2: 2x2 solid blocks
  for (let r = 0; r < n - 1; r += 1) {
    for (let c = 0; c < n - 1; c += 1) {
      const v = grid[r][c];
      if (grid[r][c + 1] === v && grid[r + 1][c] === v && grid[r + 1][c + 1] === v) {
        penalty += 3;
      }
    }
  }

  // Rule 4: Dark balance deviation from 50%
  let darkCount = 0;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (grid[r][c]) darkCount += 1;
    }
  }
  const pct = (darkCount * 100) / (n * n);
  penalty += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return penalty;
}

const MASK_FNS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

export function generateQrMatrix(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  const spec = VERSIONS_L.find((v) => bytes.length <= v.totalDataCw - 2) || VERSIONS_L[2];
  const size = spec.size;
  const codeBits = encodeBytePayload(String(text || '').slice(0, spec.totalDataCw - 2), spec);

  const baseGrid = createEmptyGrid(size);
  const isFunc = Array.from({ length: size }, () => Array(size).fill(false));

  placeFinder(baseGrid, isFunc, 0, 0);
  placeFinder(baseGrid, isFunc, 0, size - 7);
  placeFinder(baseGrid, isFunc, size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    const bit = i % 2 === 0 ? 1 : 0;
    baseGrid[6][i] = bit;
    baseGrid[i][6] = bit;
    isFunc[6][i] = true;
    isFunc[i][6] = true;
  }

  // Alignment patterns (skip corners inside finders)
  for (const cr of spec.alignCenters) {
    for (const cc of spec.alignCenters) {
      if ((cr <= 8 && cc <= 8) || (cr <= 8 && cc >= size - 9) || (cr >= size - 9 && cc <= 8)) {
        continue;
      }
      placeAlignment(baseGrid, isFunc, cr, cc);
    }
  }

  // Dark module
  baseGrid[size - 8][8] = 1;
  isFunc[size - 8][8] = true;

  // Reserve format cells
  writeFormatInfo(baseGrid, isFunc, 0);

  // Place data bits in standard zig-zag column traversal
  let bitIdx = 0;
  let dirUp = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < size; step += 1) {
      const r = dirUp ? size - 1 - step : step;
      for (const offset of [0, 1]) {
        const c = col - offset;
        if (!isFunc[r][c]) {
          baseGrid[r][c] = bitIdx < codeBits.length ? codeBits[bitIdx] : 0;
          bitIdx += 1;
        }
      }
    }
    dirUp = !dirUp;
  }

  // Evaluate all 8 masks and return lowest-penalty matrix
  let bestGrid = null;
  let bestScore = Infinity;

  for (let maskId = 0; maskId < 8; maskId += 1) {
    const cand = baseGrid.map((row) => [...row]);
    const fn = MASK_FNS[maskId];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!isFunc[r][c] && fn(r, c)) {
          cand[r][c] ^= 1;
        }
      }
    }
    writeFormatInfo(cand, isFunc, maskId);
    const score = scoreMaskPenalty(cand);
    if (score < bestScore) {
      bestScore = score;
      bestGrid = cand;
    }
  }

  return bestGrid;
}
