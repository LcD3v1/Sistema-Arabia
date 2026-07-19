# Módulo de Vendas de Munição — desenho

**Data:** 19/07/2026
**Status:** aprovado, em implementação

## Objetivo

Registrar vendas de munição: quem vendeu, o que, para qual família, como foi pago,
e se já foi quitada. Com baixa automática de um estoque próprio de munição.

## Decisões

| Questão | Decisão |
|---|---|
| Estoque | Coleção própria de munição, separada do Baú |
| Valor | Preço unitário por tipo; total calculado pelo carrinho |
| Status | `pendente` → `paga` (sem cancelamento por ora) |
| Família | Texto livre, como já é na Lavagem |

## Modelo de dados

Três coleções novas em `ArabiaData`:

### `municaoTipos: MunicaoTipo[]`
Catálogo. `{ id, nome, precoUnitario, moeda, ativo }`.
`ativo: false` aposenta um tipo sem apagar o histórico que o referencia.

### `municaoMovimentos: MunicaoMovimento[]`
`{ id, data, tipo: 'entrada'|'saida', municaoId, quantidade, vendaId?, responsavel?, observacoes? }`

O estoque **não é armazenado** — é calculado como `soma(entradas) − soma(saídas)`,
mesmo padrão já usado por `bau.ts`. Um saldo materializado dessincroniza; um
saldo derivado, não.

`vendaId` liga a saída à venda que a originou, o que dá rastreabilidade e permite
estorno futuro.

### `vendas: Venda[]`
```ts
interface VendaItem {
  municaoId: number
  nomeMunicao: string     // snapshot
  quantidade: number
  precoUnitario: number   // snapshot
  subtotal: number
}

interface Venda {
  id: number
  data: string
  membroId: number        // vendedor
  familia: string
  pagamento: 'dinheiro' | 'troca'
  itens: VendaItem[]
  total: number
  moeda: Moeda
  status: 'pendente' | 'paga'
  criadoPor?: string
  criadoEm: string
  pagoEm?: string
  pagoPor?: string
  observacoes?: string
}
```

**Snapshot de nome e preço é deliberado.** Se o preço da Muni Five mudar, as vendas
antigas devem continuar mostrando o que foi cobrado na época. Guardar só o
`municaoId` e resolver o preço na leitura reescreveria o histórico a cada reajuste.

## Regra crítica: validação de estoque

`POST /vendas` valida **todo o carrinho antes de gravar qualquer coisa**:

1. Agrega a quantidade pedida por `municaoId` (o mesmo tipo pode aparecer duas vezes).
2. Compara com o estoque calculado.
3. Se faltar qualquer item, responde 400 e **não grava nada** — nem a venda, nem
   movimentos parciais.

Sem isso, um carrinho de três itens com o terceiro em falta gravaria os dois
primeiros e deixaria o estoque inconsistente. A validação do frontend é
conveniência; a que vale é a do servidor, porque duas pessoas podem vender ao
mesmo tempo.

## Rotas — `/api/vendas`

| Método | Caminho | Permissão | Ação |
|---|---|---|---|
| GET | `/` | ver `historicoVendas` | lista com filtros (status, membroId, familia, período) e paginação |
| POST | `/` | editar `vendas` | cria venda pendente + movimentos de saída |
| PATCH | `/:id/pagar` | editar `historicoVendas` | marca como paga |
| DELETE | `/:id` | editar `historicoVendas` | remove a venda e os movimentos ligados a ela |
| GET | `/tipos` | ver `vendas` | catálogo de munição |
| POST/PATCH/DELETE | `/tipos/:id` | editar `configuracoes` | cadastro dos tipos |
| GET | `/estoque` | ver `estoqueMunicao` | saldo calculado por tipo |
| POST | `/movimentos` | editar `estoqueMunicao` | entrada manual de estoque |

`DELETE` remove também os movimentos com aquele `vendaId`, devolvendo o estoque.
Sem isso, apagar uma venda deixaria a baixa órfã e o estoque menor para sempre.

## Permissões

Três áreas novas em `AREA_IDS`: `vendas`, `historicoVendas`, `estoqueMunicao`.

`ensureAllAreas(p, grantNew)` só libera áreas novas para contas com
`configuracoes.editar`. Contas comuns **precisarão de liberação manual** em
Configurações — comportamento existente, registrado aqui para não parecer defeito.

## Telas

- **VendasPage** — vendedor → munição (com estoque ao lado) → quantidade →
  "Adicionar ao Carrinho". O carrinho é estado local do React; ao registrar,
  vai tudo num único POST.
- **HistoricoVendasPage** — lista com filtros e ação de marcar como paga.
- **EstoqueMunicaoPage** — saldo atual e entrada de estoque.
- **ConfiguraçõesPage** — nova aba para o catálogo de tipos com preço.

## Fora de escopo

- Cancelamento de venda com estorno (o `vendaId` nos movimentos já deixa o caminho pronto).
- Pagamento em "troca" continua calculando o total, como valor de referência da
  mercadoria trocada.
