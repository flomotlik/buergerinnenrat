// 32-bit deterministic PRNG. Identical numerical output as the Python
// `Mulberry32` class in scripts/generate_pool.py for the same uint32 seed.

const UINT32 = 0x100000000;
const MASK = 0xffffffff;

export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextU32(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0))) >>> 0;
    return ((t ^ (t >>> 14)) & MASK) >>> 0;
  }

  nextFloat(): number {
    return this.nextU32() / UINT32;
  }
}
