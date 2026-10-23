Day Care Center Help Desk Prototype

There are two views: parent help desk & operator control center

Url: TODO
Explanation: TODO

## Local setup

Requires Node 22+.

```sh
npm install
cp .dev.vars.example .dev.vars   # add API keys
npm run dev                      # parent app at /, operator at /operator, API at /api
```

Checks: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.
