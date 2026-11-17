// Aviso de chave grátis, sem rede: troca o fetch por um falso. Roda com `node --test` após o build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeForge } from "../dist/index.js";

const AVISO = "Sem chave: 100 itens por dia. Pegue em 1 minuto: https://fakeforge.com.br/chave?de=sdk-node";

function comApiFalsa(fn) {
  return async () => {
    const fetchOriginal = globalThis.fetch;
    const warnOriginal = console.warn;
    const avisos = [];
    const headersVistos = [];
    globalThis.fetch = async (_url, init) => {
      headersVistos.push(init.headers);
      const comChave = Boolean(init.headers["X-API-Key"]);
      return new Response(JSON.stringify({ data: ["123.456.789-09"] }), {
        status: 200,
        headers: comChave ? {} : { "X-FakeForge-Aviso": AVISO },
      });
    };
    console.warn = (msg) => avisos.push(msg);
    try {
      await fn(avisos, headersVistos);
    } finally {
      globalThis.fetch = fetchOriginal;
      console.warn = warnOriginal;
    }
  };
}

// A ordem importa: o aviso sai uma vez por processo
test("FAKEFORGE_SILENCIAR=1 esconde o aviso", comApiFalsa(async (avisos) => {
  process.env.FAKEFORGE_SILENCIAR = "1";
  await new FakeForge({ apiKey: "" }).cpf(1);
  delete process.env.FAKEFORGE_SILENCIAR;
  assert.equal(avisos.length, 0);
}));

test("com chave não avisa", comApiFalsa(async (avisos) => {
  await new FakeForge({ apiKey: "ff_teste" }).cpf(1);
  assert.equal(avisos.length, 0);
}));

test("sem chave avisa uma vez só, numa linha", comApiFalsa(async (avisos, headers) => {
  const ff = new FakeForge({ apiKey: "" });
  await ff.cpf(1);
  await ff.cpf(1);
  await new FakeForge({ apiKey: "" }).cnpj(1);
  assert.equal(avisos.length, 1);
  assert.ok(avisos[0].includes(AVISO));
  assert.ok(!avisos[0].includes("\n"));
  assert.equal(headers[0]["User-Agent"], "fakeforge-node-sdk/0.5.0");
}));
