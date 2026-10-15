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
} from "./types.js";
import { FakeForgeError } from "./types.js";

const DEFAULT_BASE_URL = "https://fakeforge.com.br";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Cliente principal do SDK FakeForge.
 *
 * @example
 * ```typescript
 * import { FakeForge } from "fakeforge";
 *
 * const ff = new FakeForge();
 * const cpfs = await ff.cpf(10); // 10 CPFs válidos
 * const customers = await ff.preset("customer", { quantity: 100 });
 * ```
 *
 * @example Com API key (plano Dev/Team)
 * ```typescript
 * const ff = new FakeForge({ apiKey: process.env.FAKEFORGE_API_KEY });
 * const cpfs = await ff.cpf(10000); // Dev libera até 10.000 por chamada
 * ```
 */
export class FakeForge {
  private apiKey?: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: FakeForgeOptions = {}) {
    this.apiKey = options.apiKey;
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
      "User-Agent": "fakeforge-node-sdk/0.1.0",
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

  /** Gera pessoa completa com nome + CPF + email + telefone + endereço correlacionados. */
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

  /** Gera conta bancária brasileira (banco + agência + conta com dígito verificador). */
  async bankAccount(quantity = 1, formatted = true): Promise<BankAccount[]> {
    return this.request<BankAccount>("bankAccount", { quantity, formatted });
  }

  /** Gera empresa completa (CNPJ + razão social + endereço). */
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
   * Gera dados correlacionados via preset. Cada preset retorna um objeto com
   * múltiplos campos que se relacionam entre si (email deriva do nome, DDD
   * bate com estado, etc).
   *
   * Presets disponíveis:
   * - customer: pessoa + endereço + email + telefone + PIX
   * - employee: pessoa + conta bancária + PIX
   * - company: empresa + endereço + contato
   * - ecommerce_order: cliente + cartão + entrega
   * - contact_list: nome + email + telefone
   *
   * @example
   * ```typescript
   * const customers = await ff.preset("customer", { quantity: 100 });
   * for (const c of customers) {
   *   console.log(c.name, c.cpf, c.email, c.address);
   * }
   * ```
   */
  async preset<T = Record<string, unknown>>(name: Preset, options: GenerateOptions = {}): Promise<T[]> {
    return this.request<T>(`preset:${name}` as const, options);
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
