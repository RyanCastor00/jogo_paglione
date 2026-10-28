# PANIC PARTY — protótipo multiplayer 3D

Base jogável em Three.js + Vite no cliente e Node.js + Express + Socket.IO no servidor. O servidor mantém salas, host, participantes, fases de rodada e pontuação; o cliente renderiza uma arena 3D procedural e permite movimentar/pular em WASD/espaço.

> **Estado honesto do projeto:** é uma primeira fatia funcional, não a versão completa descrita no briefing. O multiplayer de salas e sincronização de movimento está implementado; os quatro modos já possuem ciclos e ganchos de interação, mas suas regras ainda são prototípicas (não há IA/detecção completa do gigante, física de objetos real, mapa de rotas ou regras de plataformas seguras). Personalização persistente, contas, lista pública de salas, reconexão à mesma identidade e áudio completo ainda estão pendentes. Não foi testado em uma hospedagem pública.

## Requisitos
- Node.js 20+ e npm
- Navegador com WebGL

## Instalar e executar
Na raiz do projeto:

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

Cliente: http://localhost:5173 — servidor: http://localhost:3001/health

## Testar multiplayer local
1. Abra http://localhost:5173 numa janela, crie uma sala.
2. Abra outra janela/aba para o mesmo endereço, digite o código e entre.
3. Marque pronto; o host inicia quando houver pelo menos 2 jogadores.
4. Use WASD para mover, Espaço para pular, Shift para correr e E para ações contextuais.

O navegador precisa permitir WebGL. Para dois computadores na mesma rede, configure `VITE_SERVER_URL=http://IP-DO-SERVIDOR:3001` antes do build/desenvolvimento e permita a porta 3001 no firewall. Para jogar pela internet, hospede o servidor Node com suporte a WebSockets e o frontend estático; defina `CLIENT_ORIGIN` no servidor para a origem do frontend e `VITE_SERVER_URL` para a URL pública do servidor antes de executar `npm run build` no client. HTTPS no frontend exige WSS/HTTPS no servidor.

## Variáveis de ambiente do servidor
- `PORT` (padrão `3001`)
- `CLIENT_ORIGIN` (origens permitidas separadas por vírgula; padrão permissivo para desenvolvimento)

No deploy, defina `CLIENT_ORIGIN` para a URL real do cliente. Nunca coloque segredos no frontend.

## Testes
```bash
npm test
npm --prefix client run build
```
Os testes cobrem pontuação básica e validação do payload de movimento. Eles não equivalem a um teste de carga ou validação de gameplay completo.

## Arquitetura
- `client/src/game/Scene.js`: mundo Three.js, personagens procedurais, câmera e controles.
- `client/src/main.js`: UI, Socket.IO, salas, fluxo de rounds e inputs.
- `client/src/styles.css`: interface arcade responsiva.
- `server/src/server.js`: salas Socket.IO, validação de movimento, host, rounds e pontuação no servidor.
- `server/src/game/rules.js`: regras puras e pontuação.
- `server/test/rules.test.js`: testes unitários.
