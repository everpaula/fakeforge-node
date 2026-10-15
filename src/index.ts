/**
 * fakeforge - SDK oficial pra gerar dados brasileiros válidos (CPF, CNPJ, CEP, PIX, cartão)
 * em testes de software.
 *
 * @packageDocumentation
 */

export { FakeForge } from "./client.js";
export type {
  DataType,
  Preset,
  FakeForgeOptions,
  GenerateOptions,
  Person,
  Address,
  CreditCard,
  BankAccount,
  Company,
  FintechPresetItem,
  EcomPresetItem,
} from "./types.js";
export { FakeForgeError } from "./types.js";
