# AI Customer Service H5

Mobile H5 test client that replaces the native customer-service page during local development.

## Setup

推荐从 workspace 根目录按统一顺序启动，见 `../README.md`。

```bash
npx --yes pnpm@9.15.4 install
```

## Run

```bash
npx --yes pnpm@9.15.4 dev
```

Open the Vite URL and send messages after these services are running:

- DevOps containers: MySQL, Redis, Milvus, OpenSearch
- Python AI service on `localhost:8000`
- Go gateway on `localhost:8080`

Node.js is fixed to version 24 for this project.

## Admin Pages

The H5 project also hosts the local admin UI:

- `/admin/dashboard`
- `/admin/rules`
- `/admin/knowledge`
- `/admin/categories`
- `/admin/rag-eval`
- `/admin/trace-logs`

## Build

```bash
npx --yes pnpm@9.15.4 build
```
