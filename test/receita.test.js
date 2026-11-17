// receita() (0.5.0). Os testes sem rede trocam o fetch por um falso. O de determinismo chama a API de verdade e
// só roda com FAKEFORGE_API_KEY e FAKEFORGE_RECEITA (o nome de uma receita da sua conta). Rode após o build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeForge } from "../dist/index.js";

async function comApiFalsa(resposta, fn) {
  const fetchOriginal = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url, init) => {
    urls.push({ url: String(url), headers: init.headers });
    return new Response(JSON.stringify(resposta.body), { status: resposta.status ?? 200 });
  };
  try {
    await fn(urls);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

test("chama /api/r/<nome> com a chave e devolve os dados", () =>
  comApiFalsa({ body: { data: ["12.345.678/0001-95"] } }, async (urls) => {
    const dados = await new FakeForge({ apiKey: "ff_teste" }).receita("cnpj-fornecedores");
    assert.deepEqual(dados, ["12.345.678/0001-95"]);
    assert.equal(urls[0].url, "https://fakeforge.com.br/api/r/cnpj-fornecedores?formato=json");
    assert.equal(urls[0].headers["X-API-Key"], "ff_teste");
  }));

test("n, variar e versao viram ?n=, ?variar=1 e @v1", () =>
  comApiFalsa({ body: { data: [] } }, async (urls) => {
    const ff = new FakeForge({ apiKey: "ff_teste" });
    await ff.receita("clientes-sp", { n: 3, variar: true });
    await ff.receita("clientes-sp", { versao: 1 });
    assert.equal(urls[0].url, "https://fakeforge.com.br/api/r/clientes-sp?formato=json&n=3&variar=1");
    assert.equal(urls[1].url, "https://fakeforge.com.br/api/r/clientes-sp%40v1?formato=json");
  }));

test("receita que não existe vira FakeForgeError com 404", () =>
  comApiFalsa({ status: 404, body: { error: "not_found", message: "Receita não encontrada." } }, async () => {
    await assert.rejects(new FakeForge({ apiKey: "ff_teste" }).receita("nao-existe"), (e) => e.status === 404 && /não encontrada/.test(e.message));
  }));

const chave = process.env.FAKEFORGE_API_KEY;
const nome = process.env.FAKEFORGE_RECEITA;
test("determinismo: a mesma receita devolve os mesmos dados em toda chamada", { skip: !chave || !nome }, async () => {
  const ff = new FakeForge({ apiKey: chave });
  const primeira = JSON.stringify(await ff.receita(nome));
  for (let i = 0; i < 4; i++) assert.equal(JSON.stringify(await ff.receita(nome)), primeira);
  assert.notEqual(JSON.stringify(await ff.receita(nome, { variar: true })), primeira);
});
