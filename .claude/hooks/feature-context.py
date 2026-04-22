#!/usr/bin/env python3
"""
SubStack RU — SessionStart Hook
Reads feature-roadmap.json + git log + TODO scan.
Outputs: sprint progress, current feature, next suggested, blockers, recent commits.
"""

import json
import os
import subprocess
import sys
from pathlib import Path


def get_project_root() -> Path:
    """Find project root by looking for .claude directory."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / '.claude').exists():
            return current
        current = current.parent
    return Path.cwd()


def load_roadmap(project_root: Path) -> dict:
    """Load feature-roadmap.json."""
    roadmap_path = project_root / '.claude' / 'feature-roadmap.json'
    if not roadmap_path.exists():
        return {}
    with open(roadmap_path) as f:
        return json.load(f)


def get_recent_commits(project_root: Path, n: int = 5) -> list[str]:
    """Get last N commit messages."""
    try:
        result = subprocess.run(
            ['git', 'log', f'--max-count={n}', '--pretty=format:%s', '--no-walk=sorted'],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split('\n')
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return []


def scan_todos(project_root: Path) -> list[dict]:
    """Scan codebase for TODO and FIXME comments."""
    todos = []
    extensions = {'.ts', '.tsx', '.py', '.js', '.jsx'}
    skip_dirs = {'node_modules', '.git', 'dist', 'build', '.next', '__pycache__'}

    try:
        for root, dirs, files in os.walk(project_root):
            # Prune skip directories in-place
            dirs[:] = [d for d in dirs if d not in skip_dirs]

            for file in files:
                if Path(file).suffix not in extensions:
                    continue
                filepath = Path(root) / file
                try:
                    content = filepath.read_text(encoding='utf-8', errors='ignore')
                    for lineno, line in enumerate(content.splitlines(), 1):
                        if 'TODO' in line or 'FIXME' in line:
                            todos.append({
                                'file': str(filepath.relative_to(project_root)),
                                'line': lineno,
                                'text': line.strip()[:100],
                            })
                except (OSError, PermissionError):
                    continue
    except Exception:
        pass

    return todos[:10]  # Return max 10 TODOs to avoid noise


def compute_sprint_stats(features: list[dict]) -> dict:
    """Compute sprint progress statistics."""
    stats = {'done': 0, 'in_progress': 0, 'next': 0, 'planned': 0, 'blocked': 0}
    for feature in features:
        status = feature.get('status', 'planned')
        if status in stats:
            stats[status] += 1
    total = sum(stats.values())
    done = stats['done']
    progress_pct = round((done / total * 100) if total > 0 else 0)
    return {**stats, 'total': total, 'progress_pct': progress_pct}


def get_in_progress_features(features: list[dict]) -> list[dict]:
    """Get features currently in progress."""
    return [f for f in features if f.get('status') == 'in_progress']


def get_next_features(features: list[dict]) -> list[dict]:
    """Get features marked as next."""
    return [f for f in features if f.get('status') == 'next']


def get_blocked_features(features: list[dict]) -> list[dict]:
    """Get blocked features."""
    return [f for f in features if f.get('status') == 'blocked']


def get_ready_planned(features: list[dict]) -> list[dict]:
    """Get planned features whose dependencies are all done."""
    done_ids = {f['id'] for f in features if f.get('status') == 'done'}
    ready = []
    for f in features:
        if f.get('status') != 'planned':
            continue
        depends = f.get('depends_on', [])
        if all(dep in done_ids for dep in depends):
            ready.append(f)
    return ready[:3]


def suggest_next_actions(features: list[dict], in_progress: list, next_up: list) -> list[str]:
    """Generate top 3 suggested actions."""
    suggestions = []

    if in_progress:
        f = in_progress[0]
        suggestions.append(
            f"Continue '{f['id']}' (in progress) — finishing this first is highest priority"
        )

    for f in next_up[:2]:
        depends = f.get('depends_on', [])
        dep_note = f" (no dependencies)" if not depends else f" (deps satisfied)"
        suggestions.append(
            f"Start '{f['id']}' [{f.get('priority', '?')}]{dep_note}"
        )

    # Revenue path boost: paid-subscriptions chain
    revenue_chain = ['auth-registration', 'paid-subscriptions', 'author-payouts']
    for fid in revenue_chain:
        feature = next((f for f in features if f['id'] == fid), None)
        if feature and feature.get('status') in ('next', 'planned'):
            if not any(fid in s for s in suggestions):
                suggestions.append(
                    f"'{fid}' is on the revenue path (auth → payments → payouts) — prioritize"
                )
                break

    return suggestions[:3]


def format_output(roadmap: dict, commits: list[str], todos: list[dict]) -> str:
    """Format the context output."""
    if not roadmap:
        return "SubStack RU: feature-roadmap.json not found. Run /replicate to initialize."

    sprint = roadmap.get('current_sprint', 'Unknown')
    features = roadmap.get('features', [])

    stats = compute_sprint_stats(features)
    in_progress = get_in_progress_features(features)
    next_up = get_next_features(features)
    blocked = get_blocked_features(features)
    ready_planned = get_ready_planned(features)
    suggestions = suggest_next_actions(features, in_progress, next_up)

    lines = [
        '═══════════════════════════════════════════════════════',
        f'  SubStack RU | Sprint: {sprint}',
        f'  Progress: {stats["done"]}/{stats["total"]} done ({stats["progress_pct"]}%)',
        '═══════════════════════════════════════════════════════',
    ]

    if in_progress:
        lines.append('\nIN PROGRESS:')
        for f in in_progress:
            lines.append(f'  → {f["id"]} [{f.get("priority", "?")}]')

    if next_up:
        lines.append('\nNEXT UP (ready to start):')
        for f in next_up:
            lines.append(f'  • {f["id"]} [{f.get("priority", "?")}]')

    if ready_planned:
        lines.append('\nALSO READY (planned, deps satisfied):')
        for f in ready_planned:
            lines.append(f'  • {f["id"]} [{f.get("priority", "?")}]')

    if blocked:
        lines.append('\nBLOCKED:')
        for f in blocked:
            dep_note = ', '.join(f.get('depends_on', []))
            lines.append(f'  ⚠ {f["id"]} — waiting on: {dep_note or "unknown blocker"}')

    if commits:
        lines.append('\nRECENT COMMITS:')
        for commit in commits[:3]:
            lines.append(f'  {commit}')

    if todos:
        lines.append(f'\nTODOs IN CODEBASE: {len(todos)} found')
        for todo in todos[:3]:
            lines.append(f'  {todo["file"]}:{todo["line"]} — {todo["text"][:70]}')

    if suggestions:
        lines.append('\nSUGGESTED ACTIONS:')
        for i, s in enumerate(suggestions, 1):
            lines.append(f'  {i}. {s}')

    lines.append('═══════════════════════════════════════════════════════')
    return '\n'.join(lines)


def main() -> None:
    project_root = get_project_root()
    roadmap = load_roadmap(project_root)
    commits = get_recent_commits(project_root)
    todos = scan_todos(project_root)
    output = format_output(roadmap, commits, todos)
    print(output)


if __name__ == '__main__':
    main()
