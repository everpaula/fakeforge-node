# fakeforge-br

SDK oficial do [FakeForge](https://fakeforge.com.br) para Node.js e TypeScript: gera dados brasileiros válidos (CPF, CNPJ, CEP, PIX, cartão de crédito) para testes de software.

- ✅ **Zero dependências** (usa `fetch` nativo do Node 18+)
- ✅ **TypeScript nativo** com os tipos que a API devolve
- ✅ **CJS + ESM** builds
- ✅ **Validação real**: CPF e CNPJ passam no mod-11 da Receita Federal, cartão no Luhn, telefone com DDD da ANATEL
- ✅ **Presets com dados relacionados**: cliente ou pedido inteiro em 1 chamada, com campos que batem entre si
- ✅ **CNPJ alfanumérico 2026**: cobertura do novo formato (IN RFB 2.229)
- ✅ **Grátis para começar**: 50 chamadas/dia sem chave; chave grátis com 100 itens por chamada; plano Dev (R$29/mês) com 10.000

## Instalação

```bash
npm install fakeforge-br
```

```bash
pnpm add fakeforge-br
```

```bash
yarn add fakeforge-br
```

## Chave de API

Desde a 0.3.0 o cliente lê a chave da variável de ambiente `FAKEFORGE_API_KEY` quando você não passa `apiKey`. Pegue a sua em [fakeforge.com.br/dashboard](https://fakeforge.com.br/dashboard) (grátis, sem cartão).

```bash
export FAKEFORGE_API_KEY=ff_sua_chave
```

| | Chamadas por dia | Itens por chamada | Presets (dados relacionados) |
|---|---|---|---|
| Sem chave | 50 por IP | 50 | amostra de 3 |
| Free (chave grátis) | 50 | 100 | amostra de 3 |
| [Dev](https://fakeforge.com.br/pricing?plan=dev) (R$29/mês) | 10.000 | 10.000 | até 2.000 |
| [Team](https://fakeforge.com.br/pricing?plan=team) (R$79/mês) | 100.000 | 10.000 | até 2.000 |

## Uso rápido

```typescript
import { FakeForge } from "fakeforge-br";

const ff = new FakeForge(); // usa FAKEFORGE_API_KEY se existir

// CPFs válidos (mod-11 da Receita Federal)
const cpfs = await ff.cpf(10);
// ["123.456.789-09", "987.654.321-00", ...]

// CNPJs válidos (mod-11)
const cnpjs = await ff.cnpj(5);

// Chave PIX no formato BACEN (CPF, email, telefone ou UUID)
const pix = await ff.pixKey(3);

// Cartão de crédito com Luhn válido
const cartoes = await ff.creditCard(5);
// [{ number, holder, expiry, cvv, brand }, ...]

// Cliente com nome, CPF, email, telefone e endereço da mesma pessoa
const [cliente] = await ff.customer(1);
// { nome, cpf, email, telefone, endereco: { cep, street, neighborhood, city, state, stateCode } }
```

## Presets: dados relacionados em 1 chamada

Cada item de um preset é um cliente ou um pedido inteiro, com campos que batem entre si: o email sai do nome, as chaves Pix são o CPF, o email e o celular do próprio cliente, o cartão sai no nome do titular e o total do pedido fecha com os itens.

```typescript
import { FakeForge, type Customer } from "fakeforge-br";

const ff = new FakeForge();
const clientes = await ff.preset<Customer>("customer", 3); // no Dev, até 2.000

for (const c of clientes) {
  console.log({
    nome: c.nome,           // "Aline Fonseca Vieira"
    cpf: c.cpf,             // "640.254.907-06" (mod-11 válido)
    email: c.email,         // "aline.fonseca886@gmail.com" (derivado do nome)
    telefone: c.telefone,   // "(67) 97576-6589"
    cidade: c.endereco.city // "Salvador"
  });
}
```

Presets disponíveis:

| Preset | Retorna |
|---|---|
| `fintech` | cliente + chaves PIX do próprio CPF/email/celular + conta bancária + cartão + score Serasa + renda (`FintechPresetItem`) |
| `ecom` | pedido com cliente, endereços, carrinho de 1 a 5 produtos, pagamento e totais (`EcomPresetItem`) |
| `customer` | nome, CPF, email, telefone e endereço (`Customer`) |
| `employee` | pessoa + conta bancária + PIX |
| `company` | empresa + endereço + contato |
| `ecommerce_order` | cliente + cartão + entrega |
| `contact_list` | nome + email + telefone |

A quantidade pode ir como número (`preset("fintech", 100)`) ou como opção (`preset("fintech", { quantity: 100 })`). Sem chave e no Free a API devolve uma amostra de até 3; para lotes maiores, use o passe de 7 dias ou o plano Dev.

## Comparação com Faker.js

| Recurso | Faker.js (pt-BR) | fakeforge-br |
|---|---|---|
| CPF com mod-11 válido | ❌ (só formato) | ✅ |
| CNPJ com mod-11 válido | ❌ | ✅ |
| CNPJ alfanumérico 2026 | ❌ | ✅ |
| Cartão com Luhn | ❌ | ✅ |
| PIX BACEN (4 formatos) | ❌ | ✅ |
| Campos relacionados (email do nome, Pix do próprio CPF, cartão no nome do titular) | ❌ | ✅ |
| DDDs oficiais ANATEL | ❌ | ✅ (67 DDDs) |
| Bancos brasileiros com código COMPE real | ❌ | ✅ (15) |
| CEPs por cidade | ❌ | ✅ |

Se você usa Faker.js hoje só pra nome/endereço, funciona bem. Se precisa de CPF/CNPJ que **passe validação** (não só formato), use fakeforge-br.

## Uso com jest, vitest e Playwright

### Vitest / Jest fixture

```typescript
// setup.ts
import { FakeForge, type Customer } from "fakeforge-br";
import { beforeAll } from "vitest";

const ff = new FakeForge();
let clientes: Customer[];

beforeAll(async () => {
  clientes = await ff.customer(3); // no Dev, até 2.000
});

export function getCliente(i: number) {
  return clientes[i];
}
```

```typescript
// checkout.test.ts
import { test, expect } from "vitest";
import { getCliente } from "./setup";

test("checkout aceita o CPF do cliente", async () => {
  const cliente = getCliente(0);
  const response = await api.post("/checkout", cliente);
  expect(response.status).toBe(200);
});
```

### Playwright E2E

```typescript
import { test, expect } from "@playwright/test";
import { FakeForge } from "fakeforge-br";

const ff = new FakeForge();

test("signup fluxo completo", async ({ page }) => {
  const [cliente] = await ff.customer(1);

  await page.goto("/signup");
  await page.fill("#nome", cliente.nome);
  await page.fill("#cpf", cliente.cpf);
  await page.fill("#email", cliente.email);
  await page.fill("#telefone", cliente.telefone);
  await page.click("#continuar");

  // Formato válido = passa validação de front
  await expect(page.locator(".error")).toHaveCount(0);
});
```

### Prisma seed

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { FakeForge } from "fakeforge-br";

const prisma = new PrismaClient();
const ff = new FakeForge(); // FAKEFORGE_API_KEY de um plano Dev

async function main() {
  const clientes = await ff.customer(1000);

  await prisma.customer.createMany({
    data: clientes.map((c) => ({
      cpf: c.cpf,
      name: c.nome,
      email: c.email,
      phone: c.telefone,
    })),
  });

  console.log(`Seed: ${clientes.length} clientes inseridos`);
}

main();
```

## Planos pagos

Com a chave do plano [Dev (R$29/mês)](https://fakeforge.com.br/pricing?plan=dev): 10.000 chamadas/dia, até 10.000 itens por chamada nos tipos simples e até 2.000 nos presets. Bom pra CI/CD, seed de staging e teste de carga.

```typescript
const ff = new FakeForge(); // FAKEFORGE_API_KEY do plano Dev
const cpfs = await ff.cpf(10_000); // cabe em 1 chamada
```

## Tratamento de erros

```typescript
import { FakeForge, FakeForgeError } from "fakeforge-br";

const ff = new FakeForge();

try {
  const cpfs = await ff.cpf(1000);
} catch (err) {
  if (err instanceof FakeForgeError && err.status === 429) {
    console.error(`Limite do dia: ${err.usedToday}/${err.dailyLimit}`);
    console.error(`Plano Dev: ${err.upgradeUrl}`);
  } else if (err instanceof FakeForgeError && err.code === "quantity_limit_exceeded") {
    console.error(err.message); // pediu mais itens que o plano permite por chamada
  } else {
    throw err;
  }
}
```

## API completa

### Métodos por tipo de dado

- `cpf(quantity?, formatted?)`: CPFs válidos
- `cnpj(quantity?, formatted?)`: CNPJs numéricos válidos
- `cnpjAlfa(quantity?, formatted?)`: CNPJs alfanuméricos (IN RFB 2.229, 01/07/2026)
- `cep(quantity?, formatted?)`: CEPs por cidade
- `address(quantity?, formatted?)`: endereços completos
- `phone(quantity?, formatted?)`: celulares ANATEL (9 na frente)
- `landline(quantity?, formatted?)`: fixos residenciais (10 dígitos)
- `email(quantity?)`: emails com nomes BR
- `person(quantity?, formatted?)`: nome e gênero (para a pessoa com CPF e endereço, use `customer`)
- `customer(quantity?)`: nome, CPF, email, telefone e endereço da mesma pessoa
- `creditCard(quantity?, formatted?)`: cartão com Luhn
- `pixKey(quantity?)`: chave PIX (CPF/email/tel/EVP)
- `bankAccount(quantity?, formatted?)`: conta bancária com código COMPE real (o dígito da conta é sorteado)
- `company(quantity?, formatted?)`: empresa (CNPJ, razão social, nome fantasia, IE, contato, endereço)
- `cnh(quantity?, formatted?)`: CNH DENATRAN
- `rg(quantity?, formatted?)`: RG por estado
- `pis(quantity?, formatted?)`: PIS/PASEP/NIT/NIS
- `renavam(quantity?, formatted?)`: RENAVAM DENATRAN
- `placa(quantity?)`: placa Mercosul

### Presets

- `preset(name, quantity)` ou `preset(name, { quantity, formatted })`, com `name` entre `fintech`, `ecom`, `customer`, `employee`, `company`, `ecommerce_order` e `contact_list`

### Genérico

- `generate<T>(type, options)`: chama a API com qualquer type

## Perguntas frequentes

### É legal usar CPFs/CNPJs gerados em testes?

Sim. Gerar números que passam validação matemática (mod-11) pra fins de teste é prática padrão em desenvolvimento. Crime é usar CPF/CNPJ (fake ou real) pra fraude, sonegação ou cadastro em nome de terceiro.

### Os dados gerados batem no DICT/SPC/Serasa?

Não. São dados matematicamente válidos mas não existem em nenhuma base oficial. Perfeito pra teste de formato, validação de front-end e seed de staging. Não serve pra teste com API externa que consulta base real.

### Como configurar em CI/CD?

```yaml
# .github/workflows/test.yml
- name: Rodar testes com FakeForge
  env:
    FAKEFORGE_API_KEY: ${{ secrets.FAKEFORGE_API_KEY }}
  run: pnpm test
```

Cache dos dados gerados na primeira chamada evita esgotar quota:

```typescript
// tests/fixtures/customers.ts
import fs from "node:fs/promises";
import path from "node:path";
import { FakeForge } from "fakeforge-br";

const CACHE = path.join(__dirname, "customers.json");

export async function getCustomers() {
  try {
    return JSON.parse(await fs.readFile(CACHE, "utf8"));
  } catch {
    const ff = new FakeForge(); // FAKEFORGE_API_KEY vem do ambiente
    const clientes = await ff.customer(3); // no Dev, até 2.000
    await fs.writeFile(CACHE, JSON.stringify(clientes, null, 2));
    return clientes;
  }
}
```

### Qual a diferença entre fakeforge-br e as libs populares do npm (`cpf`, `validation-br`, `@br-validators/core`)?

| Biblioteca | Downloads/sem | Gera CPF | Gera CNPJ | Gera PIX | Gera cartão (Luhn) | Correlacionado | API HTTP |
|---|---|---|---|---|---|---|---|
| **fakeforge-br** | novo | ✅ | ✅ (num + alfa 2026) | ✅ (4 formatos BACEN) | ✅ (Visa/Master/Elo/Amex) | ✅ (email ↔ nome, Pix ↔ CPF, cartão ↔ titular) | ✅ |
| [cpf](https://www.npmjs.com/package/cpf) | 9.7K | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| [gerador-validador-cpf](https://www.npmjs.com/package/gerador-validador-cpf) | 6.1K | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| [@br-validators/core](https://www.npmjs.com/package/@br-validators/core) | 2.7K | ✅ (val) | ✅ (val) | ❌ | ❌ | ❌ | ❌ |
| [validation-br](https://www.npmjs.com/package/validation-br) | 1.8K | ✅ (val) | ✅ (val) | ❌ | ❌ | ❌ | ❌ |
| faker-js/faker (pt-BR) | 10M+ | ⚠️ (só formato) | ❌ | ❌ | ⚠️ (Luhn genérico) | ❌ | ❌ |
| validate-docbr | ~15K | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Quando escolher cada uma:**

- **cpf / gerador-validador-cpf** se você só precisa de CPF puro, tratamento mínimo, zero overhead. Lib tiny, não cobre nada além.
- **@br-validators/core / validation-br** se você só valida (não gera) CPF, CNPJ e outros docs no backend.
- **faker-js/faker** se você faz testes gerais e aceita CPFs que **não passam** no validador mod-11 real. Útil pra nome/endereço, pouco útil pra documento.
- **fakeforge-br** se você precisa de **CPF + CNPJ + PIX + cartão correlacionados** em testes end-to-end, seed de banco em escala (até 10.000 itens por chamada no Dev), ou API HTTP pra consumir de qualquer linguagem do stack sem instalar dep.

### Qual a diferença entre fakeforge-br e Faker.js (pt-BR), python-brasilidades e Laravel Brasil?

| Biblioteca | Linguagem | Foco | Validação real |
|---|---|---|---|
| **fakeforge-br** | Node/TS + API HTTP | Todos os docs BR + presets com dados relacionados | ✅ mod-11, Luhn, ANATEL, BACEN |
| faker-js/faker (pt-BR) | JS/TS | Localização genérica (nome, endereço) | ❌ (formato apenas) |
| validate-docbr | JS | Só validação de CPF/CNPJ, não geração | ✅ validação |
| python-brasilidades | Python | Documentos BR | ✅ |
| laravel-brasil | PHP | Documentos BR | ✅ |
| caelum-stella | Java | Documentos BR | ✅ |

fakeforge-br é o único com **API HTTP + SDK** que permite escalar geração em CI/CD sem instalar dependência de biblioteca em cada linguagem do stack.

## Suporte

- 📚 Docs completos: [fakeforge.com.br/docs](https://fakeforge.com.br/docs)
- 💬 Email direto: `hey@fakeforge.com.br`
- 🐛 Issues: [github.com/everpaula/fakeforge-node/issues](https://github.com/everpaula/fakeforge-node/issues)
- 🤝 Quer contribuir? Veja o [CONTRIBUTING.md](CONTRIBUTING.md)

## Licença

MIT — veja [LICENSE](./LICENSE) para detalhes.

---

Feito por [Everton Paula](https://fakeforge.com.br) — engenheiro brasileiro que precisou de dados válidos pra testar checkout PIX e escreveu essa lib porque nenhuma outra funcionava direito.
