# Troca Folha — backend inicial

Backend de desenvolvimento em Node.js + Express + MySQL para integrar as telas React Native existentes.

## Incluído

- `POST /api/auth/cadastro` — cria usuário e guarda hash da senha.
- `POST /api/auth/login` — autentica e devolve token JWT.
- `GET /api/auth/me` — devolve o usuário do token.
- `GET /api/produtos` — lista anúncios ativos; aceita `busca`, `categoria`, `min`, `max`.
- `POST /api/produtos` — cria livro e anúncio para o usuário autenticado.
- `GET /api/health` — verifica API e conexão com MySQL.
- `database/schema.sql` — cria o banco e tabelas iniciais.

## 1. Criar banco

No VS Code, abra `database/schema.sql` e execute-o conectado ao MySQL, ou abra o arquivo no MySQL Workbench e clique no raio.

## 2. Configurar backend

Abra um terminal dentro da pasta `backend`:

```bash
npm install
```

Copie `.env.example` para `.env` e informe sua senha do MySQL. Troque `JWT_SECRET` por uma frase aleatória longa. Não envie o `.env` para o GitHub.

## 3. Iniciar

```bash
npm run dev
```

Configure a variável EXPO_PUBLIC_API_URL no arquivo .env
com o endereço do backend.

Exemplo para execução na web:
EXPO_PUBLIC_API_URL=http://localhost:3000

## 4. Conectar o Expo

- Expo Web / emulador Android: geralmente `http://192.168.0.13:3000`.
- Celular físico: use o IP local do notebook, por exemplo `http://192.168.0.10:3000`; celular e notebook precisam estar na mesma rede.
- Em Android Emulator, o host do notebook costuma ser `http://10.0.2.2:3000`.

Não use `localhost` no celular físico: ele apontaria para o próprio celular.

## Formato de cadastro

`POST /api/auth/cadastro` com JSON:

```json
{
  "nome": "Nome de teste",
  "email": "teste@example.com",
  "senha": "senha123",
  "telefone": "11999999999",
  "dataNascimento": "20/10/2000",
  "estado": "SP",
  "cidade": "São Paulo"
}
```

O campo `confirma` do formulário é validado no app e não é enviado ao backend.

## Formato de login

`POST /api/auth/login`:

```json
{ "email": "teste@example.com", "senha": "senha123" }
```

Envie o token recebido nas rotas protegidas no cabeçalho:

`Authorization: Bearer SEU_TOKEN`

## Criar anúncio

`POST /api/produtos` com o token e JSON compatível com `TelaAnunciar`:

```json
{
  "titulo": "Dom Casmurro",
  "autor": "Machado de Assis",
  "editora": "Exemplo",
  "anoPublicacao": 1899,
  "preco": 29.9,
  "conservacao": "Bom estado",
  "categoria": "Literatura Brasileira",
  "area": null,
  "descricao": "Livro usado",
  "imagem": "https://exemplo.com/capa.jpg",
  "colecao": false
}
```

### Limitação de imagem

A tela atual seleciona uma imagem pelo URI local do aparelho. Esse URI não é acessível pelo backend. Neste primeiro corte, o endpoint salva uma URL pública, se for enviada; upload real de imagem precisa de uma etapa adicional.

### Limitação de pagamento

Este backend ainda não processa pagamentos reais nem integra o Mercado Pago. Não marque pedidos como pagos sem confirmação do provedor. O objetivo inicial é colocar banco, cadastro/login e catálogo em funcionamento.

## Observações

Este é um backend inicial para desenvolvimento e entrega acadêmica, não uma implantação pronta para produção. Teste as rotas e conecte as telas do app antes de considerar a integração concluída.
