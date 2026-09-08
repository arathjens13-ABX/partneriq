// Shared loader for the test suites. Extracts the JS out of dist/partneriq.html
// and evaluates it in a VM context with minimal DOM stubs, so tests exercise the
// same code that ships rather than a re-import of src/.
//
// Used by smoke_test.js (file-manager flow) and unit_test.js (pure functions).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl() {
  return {
    innerHTML: '', value: '', style: {}, dataset: {}, textContent: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild() {}, removeChild() {},
    querySelectorAll() { return []; }, querySelector() { return null; },
    setAttribute() {}, getAttribute() { return null; }, click() {}, focus() {},
  };
}

// Builds a fresh VM context with the dashboard loaded into it.
function loadDashboard() {
  const html = fs.readFileSync(path.join(__dirname, 'dist', 'partneriq.html'), 'utf-8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

  const sandbox = {
    document: {
      addEventListener() {},
      getElementById: () => makeEl(),
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: () => makeEl(),
      documentElement: { dataset: {}, outerHTML: '', classList: { add() {}, remove() {}, toggle() {} } },
      body: makeEl(),
    },
    confirm: () => true,
    prompt: () => null,
    alert: () => {},
    navigator: { userAgent: 'node' },
    console,
    setTimeout,
    clearTimeout,
    Date,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
  };
  // The app registers global error handlers at load time.
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.scrollTo = () => {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);
  scripts.forEach((s, i) => {
    // Test-only: make PRELOADED_DATA reassignable so hydrate round-trips can inject a payload
    const src = s.replace('const PRELOADED_DATA', 'let PRELOADED_DATA');
    try { vm.runInContext(src, ctx); }
    catch (e) {
      console.error(`script block ${i} failed to load:`, e.message);
      process.exit(1);
    }
  });
  return ctx;
}

// const/let bindings live in the context's lexical scope, not on globalThis.
// This bridges any name the tests need out to the context object.
function expose(ctx, names) {
  const bridge = names.map(n => `globalThis.${n} = typeof ${n} !== 'undefined' ? ${n} : undefined;`).join('\n');
  vm.runInContext(bridge, ctx);
}

// Evaluates an expression inside the loaded dashboard and returns its value.
function evalIn(ctx, expr) {
  return vm.runInContext(`(${expr})`, ctx);
}

// Minimal assertion runner shared by both suites.
function createRunner(label) {
  let failures = 0;
  let checks = 0;
  const state = {
    group(name) { console.log(name); },
    check(name, cond, detail) {
      checks++;
      if (cond) {
        console.log('  ✓ ' + name);
      } else {
        failures++;
        console.log('  ✗ FAIL ' + name + (detail !== undefined ? `  → got ${JSON.stringify(detail)}` : ''));
      }
    },
    eq(name, actual, expected) {
      state.check(name, Object.is(actual, expected) || JSON.stringify(actual) === JSON.stringify(expected), actual);
    },
    finish() {
      console.log(failures
        ? `\n${label}: ${failures} FAILURE(S) out of ${checks} checks`
        : `\n${label}: all ${checks} checks passed`);
      process.exit(failures ? 1 : 0);
    },
    get failures() { return failures; },
  };
  return state;
}

module.exports = { loadDashboard, expose, evalIn, createRunner, makeEl };
