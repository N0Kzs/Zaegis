const { parentPort } = require('worker_threads');
const solver = require('javascript-lp-solver');

parentPort.on('message', (model) => {
  try {
    const sol = solver.Solve(model);
    parentPort.postMessage({ success: true, sol });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});
