# Como contribuir

Valeu por querer ajudar. Este repositório é o SDK de Node.js e TypeScript do [FakeForge](https://fakeforge.com.br). A API em si roda em fakeforge.com.br; aqui fica só o cliente.

## Reportar um bug

Abra uma [issue](https://github.com/everpaula/fakeforge-node/issues) com:

- a versão do pacote e a do Node;
- o trecho de código que falhou;
- o que você esperava e o que aconteceu.

## Mandar uma mudança

1. Faça um fork e crie uma branch a partir da `main`.
2. Rode `npm install`, depois `npm run build` e `npm test`. Os testes chamam a API pública, então precisam de internet.
3. Abra o PR explicando o problema que ele resolve. PR pequeno é revisado mais rápido.

## Novo tipo de dado

Um documento ou formato novo depende da API, não só do SDK. Abra uma issue antes de escrever código, assim a gente combina o formato.

Dúvidas: hey@fakeforge.com.br
