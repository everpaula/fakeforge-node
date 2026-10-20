// Smoke test - roda com `node --test test/smoke.test.js` após build
// Usa o build de dist/, então requer `npm run build` antes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeForge } from "../dist/index.js";

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

test("preset customer devolve a mesma pessoa em todos os campos", async () => {
  const ff = new FakeForge();
  const [c] = await ff.preset("customer", { quantity: 1 });

  assert.ok(c.nome);
  assert.ok(c.cpf);
  assert.ok(c.email);
  assert.ok(c.telefone);
  assert.ok(c.endereco.cep);
});

test("preset aceita a quantidade como número", async () => {
  const ff = new FakeForge();
  const clientes = await ff.preset("customer", 2);
  assert.strictEqual(clientes.length, 2);
});

test("lê FAKEFORGE_API_KEY quando a chave não é passada", async () => {
  const original = globalThis.fetch;
  const previous = process.env.FAKEFORGE_API_KEY;
  let sent;
  globalThis.fetch = async (_url, init) => {
    sent = init.headers["X-API-Key"];
    return new Response(JSON.stringify({ data: ["x"] }), { status: 200 });
  };
  try {
    process.env.FAKEFORGE_API_KEY = "ff_teste_env";
    await new FakeForge().cpf(1);
    assert.strictEqual(sent, "ff_teste_env");

    await new FakeForge({ apiKey: "ff_explicita" }).cpf(1);
    assert.strictEqual(sent, "ff_explicita");

    delete process.env.FAKEFORGE_API_KEY;
    await new FakeForge().cpf(1);
    assert.strictEqual(sent, undefined);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.FAKEFORGE_API_KEY;
    else process.env.FAKEFORGE_API_KEY = previous;
  }
});

test("FakeForgeError em rate limit hit", async () => {
  const ff = new FakeForge({ baseUrl: "https://fakeforge.com.br" });

  // Pede mais itens do que o teto sem chave (50) e o do Free (100)
  await assert.rejects(
    async () => ff.cpf(500),
    (err) => {
      return err.name === "FakeForgeError" && err.status >= 400;
    }
  );
});
