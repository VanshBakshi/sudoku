import json
import random
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = 5500

DIFFICULTIES = {
    "short": {"size": 4, "box": 2, "remove": 7},
    "medium": {"size": 9, "box": 3, "remove": 45},
    "large": {"size": 16, "box": 4, "remove": 150},
}


def shuffle(values):
    values = values[:]
    random.shuffle(values)
    return values


def pattern(row, col, size, box):
    return (row * box + row // box + col) % size


def generate_solution(size, box):
    """Generate a valid complete Sudoku grid."""
    bands = shuffle(list(range(box)))
    rows = []
    for band in bands:
        for r in shuffle(list(range(box))):
            rows.append(band * box + r)

    stacks = shuffle(list(range(box)))
    cols = []
    for stack in stacks:
        for c in shuffle(list(range(box))):
            cols.append(stack * box + c)

    numbers = shuffle(list(range(1, size + 1)))

    grid = []
    for r in range(size):
        row = []
        for c in range(size):
            row.append(numbers[pattern(rows[r], cols[c], size, box)])
        grid.append(row)
    return grid


def has_solution(grid, size, box, limit=2):
    """Backtracking solver. Returns number of solutions up to limit."""
    rows = [set() for _ in range(size)]
    cols = [set() for _ in range(size)]
    boxes = [set() for _ in range(size)]

    for r in range(size):
        for c in range(size):
            v = grid[r][c]
            if v:
                b = (r // box) * box + c // box
                if v in rows[r] or v in cols[c] or v in boxes[b]:
                    return 0
                rows[r].add(v)
                cols[c].add(v)
                boxes[b].add(v)

    count = 0

    def solve():
        nonlocal count
        if count >= limit:
            return

        best = None
        best_candidates = None

        for r in range(size):
            for c in range(size):
                if grid[r][c] != 0:
                    continue
                b = (r // box) * box + c // box
                candidates = [
                    v for v in range(1, size + 1)
                    if v not in rows[r]
                    and v not in cols[c]
                    and v not in boxes[b]
                ]
                if not candidates:
                    return
                if best is None or len(candidates) < len(best_candidates):
                    best = (r, c)
                    best_candidates = candidates
                    if len(candidates) == 1:
                        break
            if best is not None and len(best_candidates) == 1:
                break

        if best is None:
            count += 1
            return

        r, c = best
        b = (r // box) * box + c // box

        for v in best_candidates:
            grid[r][c] = v
            rows[r].add(v)
            cols[c].add(v)
            boxes[b].add(v)
            solve()
            rows[r].remove(v)
            cols[c].remove(v)
            boxes[b].remove(v)
            grid[r][c] = 0
            if count >= limit:
                return

    solve()
    return count


def make_puzzle(level):
    cfg = DIFFICULTIES[level]

    # Short/medium are generated with uniqueness checking.
    # Large uses the same valid-grid generation with a bounded retry because
    # exhaustive uniqueness checking on a 16x16 puzzle can be expensive.
    for attempt in range(12):
        solution = generate_solution(cfg["size"], cfg["box"])
        puzzle = [row[:] for row in solution]
        cells = [(r, c) for r in range(cfg["size"]) for c in range(cfg["size"])]
        random.shuffle(cells)

        removed = 0
        for r, c in cells:
            old = puzzle[r][c]
            puzzle[r][c] = 0

            if level != "large":
                test = [row[:] for row in puzzle]
                if has_solution(test, cfg["size"], cfg["box"], 2) != 1:
                    puzzle[r][c] = old
                    continue

            removed += 1
            if removed >= cfg["remove"]:
                break

        if removed >= cfg["remove"]:
            return {
                "level": level,
                "size": cfg["size"],
                "box": cfg["box"],
                "puzzle": puzzle,
                "solution": solution,
            }

    # Safe fallback: always return a valid puzzle.
    solution = generate_solution(cfg["size"], cfg["box"])
    puzzle = [row[:] for row in solution]
    cells = [(r, c) for r in range(cfg["size"]) for c in range(cfg["size"])]
    random.shuffle(cells)
    for r, c in cells[:cfg["remove"]]:
        puzzle[r][c] = 0

    return {
        "level": level,
        "size": cfg["size"],
        "box": cfg["box"],
        "puzzle": puzzle,
        "solution": solution,
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def serve_file(self, filename, content_type):
        path = os.path.join(os.path.dirname(__file__), "static", filename)
        try:
            with open(path, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_error(404, "File not found")

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/":
            return self.serve_file("index.html", "text/html; charset=utf-8")
        if path == "/style.css":
            return self.serve_file("style.css", "text/css; charset=utf-8")
        if path == "/app.js":
            return self.serve_file("app.js", "application/javascript; charset=utf-8")

        if path == "/api/new-game":
            # Query is parsed manually to keep the server dependency-free.
            query = urlparse(self.path).query
            level = "medium"
            for part in query.split("&"):
                if part.startswith("difficulty="):
                    level = part.split("=", 1)[1]
            if level not in DIFFICULTIES:
                level = "medium"

            game = make_puzzle(level)
            return self.send_json(game)

        if path == "/api/health":
            return self.send_json({"status": "ok", "python": True})

        self.send_error(404, "Not found")

    def log_message(self, fmt, *args):
        print("[SERVER]", fmt % args)


if __name__ == "__main__":
    print("=" * 58)
    print("        SUDOKU ARENA - PYTHON LOCALHOST SERVER")
    print("=" * 58)
    print(f"Open: http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server.")
    print("=" * 58)

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()
