# fakeforge

SDK oficial do [FakeForge](https://fakeforge.com.br) para Node.js e TypeScript — gera dados brasileiros válidos (CPF, CNPJ, CEP, PIX, cartão de crédito) para testes de software.

- ✅ **Zero dependências** (usa `fetch` nativo do Node 18+)
- ✅ **TypeScript nativo** com types completos
- ✅ **CJS + ESM** builds
- ✅ **Validação real** — todos os documentos passam mod-11 da Receita Federal, Luhn, ANATEL
- ✅ **Presets correlacionados** — pessoa completa com CPF + email + endereço + telefone coerentes em 1 chamada
- ✅ **CNPJ alfanumérico 2026** — cobertura do novo formato (IN RFB 2.229)
- ✅ **Grátis** — 50 chamadas/dia sem API key, ou 10.000/dia com plano Dev (R$29/mês)

## Instalação

```bash
npm install fakeforge-br
```

```bash
pnpm add fakeforge
```

```bash
yarn add fakeforge
```

## Uso rápido

```typescript
import { FakeForge } from "fakeforge-br";

const ff = new FakeForge();

// CPFs válidos (mod-11 da Receita Federal)
const cpfs = await ff.cpf(10);
// ["123.456.789-09", "987.654.321-00", ...]

// CNPJs válidos (mod-11)
const cnpjs = await ff.cnpj(5);

// Chave PIX no formato BACEN (CPF, email, telefone ou UUID)
const pix = await ff.pixKey(3);

// Cartão de crédito com Luhn válido
const cartoes = await ff.creditCard(5);
// [{ number, brand, cvv, expiry }, ...]

// Pessoa completa correlacionada
const pessoa = await ff.person(1);
// [{ name, cpf, email, phone, birthdate, address }]
```

## Presets: dados correlacionados em 1 chamada

Presets retornam objetos com múltiplos campos que se relacionam entre si — email deriva do nome, DDD bate com o estado do endereço, etc.

```typescript
const customers = await ff.preset("customer", { quantity: 100 });

for (const c of customers) {
  console.log({
    name: c.name,           // "João Silva Souza"
    cpf: c.cpf,             // "123.456.789-09" (mod-11 válido)
    email: c.email,         // "joao.silva.souza@gmail.com" (derivado do nome)
    phone: c.phone,         // "(11) 98765-4321" (DDD bate com estado)
    address: c.address,     // { city: "São Paulo", state: "SP", ... }
  });
}
```

Presets disponíveis:

| Preset | Retorna |
|---|---|
| `customer` | pessoa + endereço + email + telefone + PIX |
| `employee` | pessoa + conta bancária + PIX |
| `company` | empresa + endereço + contato |
| `ecommerce_order` | cliente + cartão + entrega |
| `contact_list` | nome + email + telefone |

## Comparação com Faker.js

| Recurso | Faker.js (pt-BR) | fakeforge |
|---|---|---|
| CPF com mod-11 válido | ❌ (só formato) | ✅ |
| CNPJ com mod-11 válido | ❌ | ✅ |
| CNPJ alfanumérico 2026 | ❌ | ✅ |
| Cartão com Luhn | ❌ | ✅ |
| PIX BACEN (4 formatos) | ❌ | ✅ |
| Correlação entre campos (email deriva do nome, DDD bate com UF) | ❌ | ✅ |
| DDDs oficiais ANATEL | ❌ | ✅ (67 DDDs) |
| Bancos brasileiros reais (17) | ❌ | ✅ |
| CEPs válidos por estado | ❌ | ✅ |

Se você usa Faker.js hoje só pra nome/endereço, funciona bem. Se precisa de CPF/CNPJ que **passe validação** (não só formato), use fakeforge.

## Uso com pytest, jest, vitest

### Vitest / Jest fixture

```typescript
// setup.ts
import { FakeForge } from "fakeforge-br";
import { beforeAll } from "vitest";

const ff = new FakeForge();
let customers: unknown[];

beforeAll(async () => {
  customers = await ff.preset("customer", { quantity: 500 });
});

export function getCustomer(i: number) {
  return customers[i];
}
```

```typescript
// checkout.test.ts
import { test, expect } from "vitest";
import { getCustomer } from "./setup";

test("checkout aceita cartão válido do customer", async () => {
  const customer = getCustomer(0);
  const response = await api.post("/checkout", customer);
  expect(response.status).toBe(200);
});
```

### Playwright E2E

```typescript
import { test } from "@playwright/test";
import { FakeForge } from "fakeforge-br";

const ff = new FakeForge();

test("signup fluxo completo", async ({ page }) => {
  const [pessoa] = await ff.person(1);

  await page.goto("/signup");
  await page.fill("#nome", pessoa.name);
  await page.fill("#cpf", pessoa.cpf);
  await page.fill("#email", pessoa.email);
  await page.fill("#telefone", pessoa.phone);
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
const ff = new FakeForge({ apiKey: process.env.FAKEFORGE_API_KEY });

async function main() {
  const customers = await ff.preset("customer", { quantity: 1000 });

  await prisma.customer.createMany({
    data: customers.map((c: any) => ({
      cpf: c.cpf,
      name: c.name,
      email: c.email,
      phone: c.phone,
    })),
  });

  console.log(`✓ Seed: ${customers.length} customers inseridos`);
}

main();
```

## API key opcional (plano Dev/Team)

Sem API key: 50 chamadas/dia por IP, até 100 items por chamada. Perfeito pra dev local.

Com API key do plano [Dev (R$29/mês)](https://fakeforge.com.br/pricing?plan=dev): 10.000 chamadas/dia, até 10.000 items por chamada. Ideal pra CI/CD, seed em produção, load test.

```typescript
const ff = new FakeForge({ apiKey: process.env.FAKEFORGE_API_KEY });
const cpfs = await ff.cpf(10_000); // no Dev, cabe em 1 chamada
```

Pegue sua API key em [fakeforge.com.br/dashboard](https://fakeforge.com.br/dashboard).

## Tratamento de erros

```typescript
import { FakeForge, FakeForgeError } from "fakeforge-br";

const ff = new FakeForge();

try {
  const cpfs = await ff.cpf(1000);
} catch (err) {
  if (err instanceof FakeForgeError && err.status === 429) {
    console.error(`Rate limit atingido: ${err.usedToday}/${err.dailyLimit}`);
    console.error(`Assine plano Dev: ${err.upgradeUrl}`);
  } else {
    throw err;
  }
}
```

## API completa

### Métodos por tipo de dado

- `cpf(quantity?, formatted?)` — CPFs válidos
- `cnpj(quantity?, formatted?)` — CNPJs numéricos válidos
- `cnpjAlfa(quantity?, formatted?)` — CNPJs alfanuméricos (IN RFB 2.229, 01/07/2026)
- `cep(quantity?, formatted?)` — CEPs válidos por estado
- `address(quantity?, formatted?)` — endereços completos
- `phone(quantity?, formatted?)` — celulares ANATEL (9 na frente)
- `landline(quantity?, formatted?)` — fixos residenciais (10 dígitos)
- `email(quantity?)` — emails com nomes BR
- `person(quantity?, formatted?)` — pessoa completa correlacionada
- `creditCard(quantity?, formatted?)` — cartão com Luhn
- `pixKey(quantity?)` — chave PIX (CPF/email/tel/EVP)
- `bankAccount(quantity?, formatted?)` — conta bancária com DV por banco
- `company(quantity?, formatted?)` — empresa (CNPJ + razão social + endereço)
- `cnh(quantity?, formatted?)` — CNH DENATRAN
- `rg(quantity?, formatted?)` — RG por estado
- `pis(quantity?, formatted?)` — PIS/PASEP/NIT/NIS
- `renavam(quantity?, formatted?)` — RENAVAM DENATRAN
- `placa(quantity?)` — placa Mercosul

### Presets

- `preset("customer", options)`
- `preset("employee", options)`
- `preset("company", options)`
- `preset("ecommerce_order", options)`
- `preset("contact_list", options)`

### Genérico

- `generate<T>(type, options)` — chama a API com qualquer type

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
    const ff = new FakeForge();
    const customers = await ff.preset("customer", { quantity: 100 });
    await fs.writeFile(CACHE, JSON.stringify(customers, null, 2));
    return customers;
  }
}
```

### Qual a diferença entre fakeforge-br e as libs populares do npm (`cpf`, `validation-br`, `@br-validators/core`)?

| Biblioteca | Downloads/sem | Gera CPF | Gera CNPJ | Gera PIX | Gera cartão (Luhn) | Correlacionado | API HTTP |
|---|---|---|---|---|---|---|---|
| **fakeforge-br** | novo | ✅ | ✅ (num + alfa 2026) | ✅ (4 formatos BACEN) | ✅ (Visa/Master/Elo/Amex) | ✅ (email ↔ nome ↔ DDD ↔ CEP) | ✅ |
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
- **fakeforge-br** se você precisa de **CPF + CNPJ + PIX + cartão correlacionados** em testes end-to-end, seed de banco em escala (10K+ linhas), ou API HTTP pra consumir de qualquer linguagem do stack sem instalar dep.

### Qual a diferença entre fakeforge-br e Faker.js (pt-BR), python-brasilidades e Laravel Brasil?

| Biblioteca | Linguagem | Foco | Validação real |
|---|---|---|---|
| **fakeforge-br** | Node/TS + API HTTP | Todos os docs BR + presets correlacionados | ✅ mod-11, Luhn, ANATEL, BACEN |
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
