Day Care Center Help Desk Prototype

There are two views: parent help desk & operator control center

Url: TODO
Explanation: TODO

## Local setup

Requires Node 22+.

```sh
npm install
cp .dev.vars.example .dev.vars   # add your OpenRouter key
npm run db:reset                 # create local D1 tables + seed KB and history
npm run dev                      # landing at /, parent at /parent, operator at /operator, API at /api
```

Checks: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.
