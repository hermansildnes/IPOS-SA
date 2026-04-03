# Team Project: IPOS-SA

It is important we use this repo to track any work done. In part for the entire team to be able to access it and avoid multiple people working on the same thing, but also as proof of work done consistently for final marking.

## Quick start

### Prerequisites
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager
- [Node.js](https://nodejs.org/) (v20+)

### 1. Start the backend
```bash
cd backend
uv run fastapi dev main.py
```
That's it — `uv` installs all dependencies automatically on first run. A local `ipos_sa.db` file is created as the database.

API available at http://localhost:8000 · Interactive docs at http://localhost:8000/docs

### 2. Start the frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
App available at http://localhost:5173.


### 3. Run Tests. cd frontend, npm test -- --run



### Stopping
`Ctrl+C` in each terminal. The database file persists between runs. Delete `backend/ipos_sa.db` to start fresh.

### After pulling changes
If the data models have changed, your local database will be out of date. Just delete it and restart the backend:
```bash
rm backend/ipos_sa.db        # Windows: del backend\ipos_sa.db
uv run fastapi dev main.py   # recreates the schema automatically
```

---

## Commit convention
Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) style of commit messages. This allows us to quickly understand what others have done, and is also a good habit to develop for your future career. If you are not used to structured commit messages, please spend 5
minutes reading https://www.conventionalcommits.org/en/v1.0.0/ and you'll get a hang of it right away. Don't stress the details too much, but please use 'feat:', 'fix:', 'docs:' and 'test:' with brief, but descriptive messages of what have been done. And please rather commit too often than too
rarely. No one likes massive commits.



