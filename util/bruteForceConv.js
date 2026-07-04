export default function bruteForceConvolve(a, b) {
  const resLen = a.length + b.length - 1;
  const res = new Array(resLen).fill(0);

  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      res[i + j] += a[i] * b[j];
    }
  }
  return res;
}