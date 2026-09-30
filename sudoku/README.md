# 🎮 Sudoku Arena — Python Localhost

This is a complete Sudoku game with a Python backend.

## Requirements

- Python 3.9+
- VS Code
- Any modern browser

**No Flask, Node.js, npm, database or external package is required.**

## Folder

```text
Sudoku_Arena_Python/
│
├── server.py
│
└── static/
    ├── index.html
    ├── style.css
    └── app.js
```

## Run

Open the folder in VS Code.

Open the VS Code terminal and run:

```bash
python server.py
```

Then open:

```text
http://localhost:5500
```

Keep the terminal running while you play.

Stop the server with:

```text
Ctrl + C
```

## Game modes

### Short
4 × 4 board for a quick game.

### Medium
9 × 9 classic Sudoku.

### Large
16 × 16 huge Sudoku using numbers 1–9 and letters A–G.

## Features

- Python-generated Sudoku puzzles
- New random puzzle every game
- Difficulty selection
- Stopwatch
- Score counter
- Mistake counter
- 3 hints
- Pause/resume
- Check
- Erase
- Keyboard input
- Responsive UI
- Localhost operation
- No account and no database

The Python server exposes:

- `/api/new-game?difficulty=short`
- `/api/new-game?difficulty=medium`
- `/api/new-game?difficulty=large`
- `/api/health`

The browser UI communicates with Python using normal HTTP requests.

## If `python` does not work on Windows

Try:

```bash
py server.py
```

Then visit:

```text
http://localhost:5500
```
