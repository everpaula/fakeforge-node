// Smoke test - roda com `node --test test/smoke.test.js` após build
// Usa o build de dist/, então requer `npm run build` antes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeForge } from "../dist/index.mjs";

test("gera 5 CPFs válidos", async () => {
  const ff = new FakeForge();
  const cpfs = await ff.cpf(5);

  assert.strictEqual(cpfs.length, 5);
  for (const cpf of cpfs) {
    assert.match(cpf, /^\d{3}\.\d{3}\.\d{3}-\d{2}$/, `CPF ${cpf} não bate formato`);
  }
});

test("gera CNPJ alfanumérico", async () => {
  const ff = new FakeForge();
  const [cnpj] = await ff.cnpjAlfa(1);

  assert.ok(cnpj);
  // CNPJ alfa tem 14 chars, os últimos 2 são numéricos (DV)
  const cleaned = cnpj.replace(/[^\w]/g, "");
  assert.strictEqual(cleaned.length, 14);
});

test("preset customer retorna pessoa correlacionada", async () => {
  const ff = new FakeForge();
  const [c] = await ff.preset("customer", { quantity: 1 });

  assert.ok(c.name);
  assert.ok(c.cpf);
  assert.ok(c.email);
  assert.ok(c.phone);
});

test("FakeForgeError em rate limit hit", async () => {
  const ff = new FakeForge({ baseUrl: "https://fakeforge.com.br" });

  // Tenta pedir mais items do que o cap Free permite (100)
  await assert.rejects(
    async () => ff.cpf(500),
    (err) => {
      return err.name === "FakeForgeError" && err.status >= 400;
    }
  );
});
