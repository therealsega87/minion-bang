// Run from the repository root: node tests/engine.test.mjs
import { runEngineSelfTests } from "../scripts/engine/self-test.js";

const { passed, failed, total, cases } = runEngineSelfTests();

for (const c of cases) {
  if (c.pass) {
    console.log(`  OK  ${c.label}`);
  } else {
    console.log(`FAIL  ${c.label}`);
    if (c.error) {
      console.log(`      threw: ${c.error}`);
    } else {
      console.log(`      expected: ${JSON.stringify(c.expected)}`);
      console.log(`      actual:   ${JSON.stringify(c.actual)}`);
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${total} total.\n`);
process.exit(failed === 0 ? 0 : 1);
