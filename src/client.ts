import type {
  DataType,
  Preset,
  FakeForgeOptions,
  GenerateOptions,
  Person,
  Address,
  CreditCard,
  BankAccount,
  Company,
  Customer,
} from "./types.js";
import { FakeForgeError } from "./types.js";

const DEFAULT_BASE_URL = "https://fakeforge.com.br";
const DEFAULT_TIMEOUT_MS = 30_000;
const VERSION = "0.3.0";

// Sem apiKey nas opções, vale a variável de ambiente (Node, Bun, Deno com
// --allow-env). No navegador não existe process e o cliente segue sem chave.
function envApiKey(): string | undefined {
  try {
    return typeof process !== "undefined" ? process.env?.FAKEFORGE_API_KEY || undefined : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cliente principal do SDK FakeForge.
 *
 * @example
 * ```typescript
 * import { FakeForge } from "fakeforge-br";
 *
 * // Lê FAKEFORGE_API_KEY do ambiente; sem ela, usa o acesso sem chave
 * const ff = new FakeForge();
 * const cpfs = await ff.cpf(10); // 10 CPFs válidos
 * const clientes = await ff.preset("customer", 3);
 * ```
 *
 * @example Chave explícita (plano Dev/Team)
 * ```typescript
 * const ff = new FakeForge({ apiKey: "ff_..." });
 * const cpfs = await ff.cpf(10000); // Dev libera até 10.000 por chamada
 * ```
 */
export class FakeForge {
  private apiKey?: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: FakeForgeOptions = {}) {
    this.apiKey = options.apiKey ?? envApiKey();
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(
    type: DataType | `preset:${Preset}`,
    options: GenerateOptions = {}
  ): Promise<T[]> {
    const quantity = options.quantity ?? 1;
    const formatted = options.formatted ?? true;

    let url: string;
    if (type.startsWith("preset:")) {
      const preset = type.slice("preset:".length);
      url = `${this.baseUrl}/api/generate?preset=${encodeURIComponent(preset)}&quantity=${quantity}&formatted=${formatted}`;
    } else {
      url = `${this.baseUrl}/api/generate?type=${encodeURIComponent(type)}&quantity=${quantity}&formatted=${formatted}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": `fakeforge-node-sdk/${VERSION}`,
    };
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, { method: "GET", headers, signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new FakeForgeError(`Request timeout após ${this.timeoutMs}ms`, 0);
      }
      throw new FakeForgeError(`Erro de rede: ${err instanceof Error ? err.message : String(err)}`, 0);
    }
    clearTimeout(timer);

    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new FakeForgeError(`Resposta inválida da API (${response.status})`, response.status);
    }

    if (!response.ok) {
      const message = (body?.message as string) || (body?.error as string) || `HTTP ${response.status}`;
      throw new FakeForgeError(message, response.status, body);
    }

    return (body.data as T[]) || [];
  }

  /** Gera 1 ou mais CPFs válidos (mod-11 da Receita Federal). */
  async cpf(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("cpf", { quantity, formatted });
  }

  /** Gera 1 ou mais CNPJs válidos no formato numérico (mod-11). */
  async cnpj(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("cnpj", { quantity, formatted });
  }

  /** Gera 1 ou mais CNPJs no novo formato alfanumérico (IN RFB 2.229, vigência 01/07/2026). */
  async cnpjAlfa(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("cnpjAlfa", { quantity, formatted });
  }

  /** Gera 1 ou mais CEPs válidos por estado. */
  async cep(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("cep", { quantity, formatted });
  }

  /** Gera endereços brasileiros completos (rua, bairro, cidade, estado, CEP). */
  async address(quantity = 1, formatted = true): Promise<Address[]> {
    return this.request<Address>("address", { quantity, formatted });
  }

  /** Gera 1 ou mais celulares com formato ANATEL válido (9 na frente + DDD). */
  async phone(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("phone", { quantity, formatted });
  }

  /** Gera 1 ou mais telefones fixos residenciais (10 dígitos, sem 9). */
  async landline(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("landline", { quantity, formatted });
  }

  /** Gera emails com nomes brasileiros e domínios populares. */
  async email(quantity = 1): Promise<string[]> {
    return this.request<string>("email", { quantity });
  }

  /** Gera nome e gênero. Para CPF, email, telefone e endereço da mesma pessoa, use preset("customer"). */
  async person(quantity = 1, formatted = true): Promise<Person[]> {
    return this.request<Person>("person", { quantity, formatted });
  }

  /** Gera cartão de crédito com Luhn válido (qualquer bandeira). */
  async creditCard(quantity = 1, formatted = true): Promise<CreditCard[]> {
    return this.request<CreditCard>("creditCard", { quantity, formatted });
  }

  /** Gera chave PIX no formato BACEN (CPF, email, telefone ou EVP UUID). */
  async pixKey(quantity = 1): Promise<string[]> {
    return this.request<string>("pixKey", { quantity });
  }

  /** Gera conta bancária com código COMPE real (15 bancos); o dígito da conta é sorteado. */
  async bankAccount(quantity = 1, formatted = true): Promise<BankAccount[]> {
    return this.request<BankAccount>("bankAccount", { quantity, formatted });
  }

  /** Gera empresa completa (CNPJ, razão social, nome fantasia, IE, contato e endereço). */
  async company(quantity = 1, formatted = true): Promise<Company[]> {
    return this.request<Company>("company", { quantity, formatted });
  }

  /** Gera CNH válida (mod-11 do DENATRAN). */
  async cnh(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("cnh", { quantity, formatted });
  }

  /** Gera RG no formato de estado (mod-11). */
  async rg(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("rg", { quantity, formatted });
  }

  /** Gera PIS/PASEP/NIT/NIS válido. */
  async pis(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("pis", { quantity, formatted });
  }

  /** Gera RENAVAM válido (mod-11 do DENATRAN). */
  async renavam(quantity = 1, formatted = true): Promise<string[]> {
    return this.request<string>("renavam", { quantity, formatted });
  }

  /** Gera placa Mercosul (formato LLLNLNN). */
  async placa(quantity = 1): Promise<string[]> {
    return this.request<string>("placa", { quantity });
  }

  /**
   * Gera dados relacionados via preset: cada item é um cliente ou pedido
   * inteiro, com campos que batem entre si (chaves Pix do próprio CPF, email
   * e celular; cartão no nome do titular; total que fecha com o carrinho).
   *
   * Presets disponíveis:
   * - fintech: cliente + chaves Pix + conta bancária + cartão + score + renda (FintechPresetItem)
   * - ecom: pedido inteiro com carrinho, pagamento e totais (EcomPresetItem)
   * - customer: nome, CPF, email, telefone e endereço (Customer)
   * - employee: pessoa + conta bancária + PIX
   * - company: empresa + endereço + contato
   * - ecommerce_order: cliente + cartão + entrega
   * - contact_list: nome + email + telefone
   *
   * Sem chave e no Free a API devolve amostra de até 3 por chamada; nos planos
   * pagos, até 2.000.
   *
   * @example
   * ```typescript
   * const clientes = await ff.preset<Customer>("customer", 3);
   * for (const c of clientes) console.log(c.nome, c.cpf, c.email, c.endereco.city);
   * ```
   */
  async preset<T = Record<string, unknown>>(name: Preset, options: GenerateOptions | number = {}): Promise<T[]> {
    const opts = typeof options === "number" ? { quantity: options } : options;
    return this.request<T>(`preset:${name}` as const, opts);
  }

  /** Atalho para preset("customer"): a mesma pessoa em todos os campos. */
  async customer(quantity = 1): Promise<Customer[]> {
    return this.request<Customer>("preset:customer", { quantity });
  }

  /**
   * Genérico: chama a API com qualquer type. Útil se você quer um type que
   * ainda não tem método dedicado.
   *
   * @example
   * ```typescript
   * const data = await ff.generate<string>("tituloEleitor", { quantity: 10 });
   * ```
   */
  async generate<T = unknown>(type: DataType, options: GenerateOptions = {}): Promise<T[]> {
    return this.request<T>(type, options);
  }
}
