# Sistema Arábia

Sistema de gestão de facção (GTA RP) — full-stack TypeScript.
Backend **Express** + frontend **React/Vite** (o backend serve o frontend buildado, então é **um único serviço**).

Módulos: Dashboard, Comunicados (tempo real via SSE), Registrar Ação (Tiro/Fuga), Histórico,
Estatísticas, Membros, Ausências, Baú + Estoque, Tablet (saque/depósito), Lavagem, e Configurações
com **permissões por área (ver/editar) por conta**.

---

## 🚀 Deploy na ShardCloud

O projeto é **um serviço só** (o backend serve a interface). Configure assim:

| Campo | Valor |
|---|---|
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Porta** | injetada automaticamente pela ShardCloud (`PORT`) — não fixar |

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `JWT_SECRET` | ✅ **sim** | Segredo p/ assinar os tokens (mín. 32 chars). Gere: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DATA_PATH` | recomendada | Caminho do `data.json` num **volume persistente** (ex: `/data/arabia.json`) — senão os dados são perdidos a cada restart |
| `AUDIT_LOG_PATH` | opcional | Caminho do log de auditoria num volume persistente (ex: `/data/audit.log`) |
| `NODE_ENV` | opcional | `production` (o `npm start` já define) |

> ⚠️ O servidor **não inicia** se `JWT_SECRET` estiver ausente ou fraco.

### Volume persistente
Aponte `DATA_PATH` (e `AUDIT_LOG_PATH`) para um volume montado, ex: `/data/`.
Sem isso, os dados ficam no container e somem ao reiniciar.

### Primeiro acesso
No primeiro start é criada a conta **`admin` / `admin123`** com acesso total.
**Troque a senha** e ajuste as permissões em *Configurações → Contas*.

---

## 💻 Rodar local

```bash
# 1. dependências + build
npm run build

# 2. configurar segredo
cp backend/.env.example backend/.env   # edite e gere um JWT_SECRET forte

# 3. iniciar (serve API + frontend na mesma porta)
npm start            # usa PORT do ambiente, padrão 3001
```

Desenvolvimento (2 processos, hot-reload):
```bash
npm run dev:backend   # API em :3001
npm run dev:frontend  # Vite em :5173 (proxy /api -> :3001)
```

---

## 🔒 Segurança
Helmet + CSP, rate-limiting, proteção brute-force, bcrypt (12), JWT com expiração + blacklist,
sanitização de input, bloqueio de dotfiles, token no header (sem CSRF). Dados (`data.json`),
segredos (`.env`) e logs **não** são versionados.
