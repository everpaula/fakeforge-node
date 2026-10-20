/**
 * SDK oficial do FakeForge - types compartilhados
 *
 * @packageDocumentation
 */

/**
 * Tipos de dado que o FakeForge gera.
 * Corresponde 1:1 aos endpoints da API REST.
 */
export type DataType =
  | "cpf"
  | "cnpj"
  | "cnpjAlfa"
  | "cnh"
  | "cin"
  | "rg"
  | "pis"
  | "renavam"
  | "tituloEleitor"
  | "placa"
  | "placaAntiga"
  | "cep"
  | "address"
  | "person"
  | "fullName"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "landline"
  | "bankAccount"
  | "pixKey"
  | "creditCard"
  | "creditCardVisa"
  | "creditCardMastercard"
  | "creditCardElo"
  | "creditCardHipercard"
  | "creditCardAmex"
  | "company"
  | "random4"
  | "random6"
  | "random8";

/**
 * Presets disponíveis. Cada preset retorna um objeto com múltiplos campos
 * correlacionados (ex: customer = pessoa + endereço + contato).
 */
export type Preset =
  | "customer"
  | "employee"
  | "company"
  | "ecommerce_order"
  | "contact_list"
  | "fintech"
  | "ecom";

/**
 * Preset fintech: cliente completo pra teste de checkout PIX, credit engine ou antifraude.
 * CPF + PIX (3-4 chaves) + conta bancária + cartão + score Serasa + renda coerentes.
 */
export interface FintechPresetItem {
  customer: {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    endereco: Address;
    renda_mensal: number;
    score_serasa: number;
  };
  pix_keys: Array<{ type: "cpf" | "email" | "phone" | "aleatoria"; value: string }>;
  bank_account: BankAccount;
  credit_card: CreditCard;
}

/**
 * Preset ecom: pedido completo pra teste de checkout ecommerce.
 * Cliente + endereços + carrinho (1-5 produtos) + payment (cartão/PIX/boleto) + totais.
 */
export interface EcomPresetItem {
  customer: {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
  };
  shipping_address: Address;
  billing_address: Address;
  cart: Array<{
    sku: string;
    name: string;
    category: string;
    variation: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  payment: {
    method: "credit_card" | "pix" | "boleto";
    credit_card?: CreditCard;
    pix_code?: string;
    boleto_linha_digitavel?: string;
  };
  totals: {
    subtotal: number;
    shipping: number;
    total: number;
  };
}

/**
 * Opções ao instanciar o cliente FakeForge.
 */
export interface FakeForgeOptions {
  /**
   * API key. Se não for passada, o cliente lê a variável de ambiente
   * FAKEFORGE_API_KEY. Sem chave: 50 chamadas/dia por IP e até 50 itens por
   * chamada. Chave grátis: 100 itens por chamada. Dev: 10.000 chamadas/dia e
   * 10.000 itens por chamada. Pegue a sua em https://fakeforge.com.br/dashboard
   */
  apiKey?: string;

  /**
   * Base URL da API. Default: https://fakeforge.com.br
   * Só mude se estiver rodando FakeForge self-hosted.
   */
  baseUrl?: string;

  /**
   * Timeout de fetch em ms. Default: 30000 (30s).
   */
  timeoutMs?: number;
}

/**
 * Opções pra cada chamada de generate.
 */
export interface GenerateOptions {
  /**
   * Quantidade de itens. Default: 1. Máximo por chamada: 50 sem chave, 100 no
   * Free, 10.000 no Dev e no Team. Presets: amostra de 3 sem chave e no Free,
   * até 2.000 nos planos pagos.
   */
  quantity?: number;

  /** Se true (default), retorna com formatação BR (pontos, hífens). Se false, retorna só dígitos. */
  formatted?: boolean;
}

/**
 * Retornado por person(): nome e gênero. Para a pessoa com CPF, email, telefone
 * e endereço, use preset("customer"), que devolve Customer.
 */
export interface Person {
  firstName: string;
  lastName: string;
  fullName: string;
  gender: "male" | "female";
}

/** Endereço com CEP da cidade (10 estados cobertos). */
export interface Address {
  cep: string;
  /** Logradouro com número, ex: "Rua Pernambuco, 238" */
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  /** Sigla da UF, ex: "RJ" */
  stateCode: string;
}

/** Retornado por preset("customer"): a mesma pessoa em todos os campos. */
export interface Customer {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  endereco: Address;
}

/** Cartão com número que passa no algoritmo de Luhn. */
export interface CreditCard {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
  brand: string;
}

/** Conta bancária com código COMPE real (15 bancos). O dígito da conta é sorteado. */
export interface BankAccount {
  bankCode: string;
  bankName: string;
  agency: string;
  account: string;
  accountDigit: string;
}

/** Empresa fictícia com CNPJ válido (mod-11). */
export interface Company {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  phone: string;
  email: string;
  address: Address;
}

/**
 * Erro específico do FakeForge com contexto adicional.
 */
export class FakeForgeError extends Error {
  public status: number;
  public code: string;
  public upgradeUrl?: string;
  public plan?: string;
  public dailyLimit?: number;
  public usedToday?: number;

  constructor(message: string, status: number, body?: Record<string, unknown>) {
    super(message);
    this.name = "FakeForgeError";
    this.status = status;
    this.code = (body?.error as string) || "unknown";
    this.upgradeUrl = (body?.upgrade_url as string) || (body?.upgrade as Record<string, string>)?.url;
    this.plan = body?.plan as string;
    this.dailyLimit = body?.daily_limit as number;
    this.usedToday = body?.your_usage_today as number;
  }
}
