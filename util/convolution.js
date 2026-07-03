import FFT from '../lib/fft.js';

export default class FFTConv {
  constructor(n) {
    // fft.js requires the transform size to be a power of 2
    let size = 1;
    while (size < n) size <<= 1;
    this.n = size;
    this.fft = new FFT(this.n);
  }

  convolve(a, b) {
    if (a.length === 0 || b.length === 0) {
      return [];
    }

    const n = this.n;
    const resLen = a.length + b.length - 1;
    if (resLen > n) {
      throw new Error(
        `a.length + b.length - 1 is ${a.length} + ${b.length} - 1 = ${resLen}, ` +
        `expected <= ${n}`);
    }

    // Zero-pad both signals to length n
    const paddedA = new Array(n).fill(0);
    const paddedB = new Array(n).fill(0);
    a.forEach((v, i) => paddedA[i] = v);
    b.forEach((v, i) => paddedB[i] = v);

    // Transform both signals into the frequency domain
    const outA = this.fft.createComplexArray();
    const outB = this.fft.createComplexArray();
    this.fft.realTransform(outA, paddedA);
    this.fft.completeSpectrum(outA);
    this.fft.realTransform(outB, paddedB);
    this.fft.completeSpectrum(outB);

    // Pointwise multiply in the frequency domain (this replaces the O(n^2) convolution)
    const product = this.fft.createComplexArray();
    for (let i = 0; i < product.length; i += 2) {
      const re1 = outA[i], im1 = outA[i + 1];
      const re2 = outB[i], im2 = outB[i + 1];
      product[i] = re1 * re2 - im1 * im2;
      product[i + 1] = re1 * im2 + im1 * re2;
    }

    // Inverse transform back to the time domain
    const out = this.fft.createComplexArray();
    this.fft.inverseTransform(out, product);

    // Extract real parts and trim to the expected result length
    const res = [];
    for (let i = 0; i < resLen; i++) {
      res.push(out[i * 2]);
    }
    return res;
  }
}