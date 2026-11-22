# Runs a learner's file for a check. It is never copied into the workspace.
#
# grading.mjs starts it as `python3 -I -B harness.py` in a sandbox copy of the workspace and sends
# a JSON spec on standard input. The file is read the way Python reads it: a line Python cannot
# read stops everything. Otherwise the file runs one part at a time, the lines above the first
# `# Task` comment, then the lines under each `# Task N` comment, all in one set of names. Each
# part's printed lines, error and names are reported as soon as it ends, so a part that never ends
# or fails does not hide what the parts before it did, and a later part keeps running after an
# earlier one failed. Each report is a line that starts with MARK, the only lines Check reads.
#
# The spec: {file, shown, root, given, upto, inject, names, comments}. `given` puts Check's own
# value on the first top-level line that makes each name, `inject` sets names right before part
# `upto` runs, and nothing after part `upto` runs. Written for Python 3.9 and later.
import ast
import builtins
import io
import json
import math
import os
import re
import sys
import tokenize
import traceback

MARK = '@@indent '
MAX_PRINTED = 200000
TASK_LINE = re.compile(r'\s*#\s*Task\s+(\d+)\b')

channel = sys.stdout


def emit(record):
    channel.write(MARK + json.dumps(record) + '\n')
    channel.flush()


def guard(root):
    """Lets the learner's code write only inside the sandbox copy, and start no other program."""
    writes = os.O_WRONLY | os.O_RDWR | os.O_APPEND | os.O_CREAT | os.O_TRUNC
    changes = {
        'os.remove', 'os.rmdir', 'os.mkdir', 'os.rename', 'os.chmod', 'os.chown', 'os.truncate',
        'os.utime', 'os.symlink', 'os.link', 'shutil.rmtree', 'shutil.copyfile', 'shutil.move'
    }
    programs = {
        'subprocess.Popen', 'os.system', 'os.exec', 'os.posix_spawn', 'os.spawn', 'os.fork',
        'os.forkpty', 'os.startfile', 'os.kill', 'os.killpg'
    }

    def inside(path):
        if isinstance(path, int):
            return True
        try:
            real = os.path.realpath(os.path.abspath(os.fsdecode(os.fspath(path))))
        except (TypeError, ValueError):
            return True
        return real == root or real.startswith(root + os.sep)

    def hook(event, args):
        if event == 'open':
            flags = args[2] if len(args) > 2 and isinstance(args[2], int) else 0
            if flags & writes and not inside(args[0]):
                raise PermissionError('Check lets a program write only inside its workspace')
        elif event in changes:
            for arg in args:
                if isinstance(arg, (str, bytes, os.PathLike)) and not inside(arg):
                    raise PermissionError('Check lets a program change files only inside its workspace')
        elif event in programs:
            raise PermissionError('Check does not let a program start other programs')

    sys.addaudithook(hook)


class Printed(io.TextIOBase):
    """What one part prints. A program that prints without end is stopped."""

    total = 0

    def __init__(self, task):
        self.task = task
        self.parts = []

    def writable(self):
        return True

    def write(self, text):
        text = str(text)
        Printed.total += len(text)
        if Printed.total > MAX_PRINTED:
            emit({'kind': 'flood', 'task': self.task})
            os._exit(0)
        self.parts.append(text)
        return len(text)

    def text(self):
        return ''.join(self.parts)


def value_of(value):
    out: dict = {'type': type(value).__name__, 'repr': repr(value)[:300]}
    if value is None or isinstance(value, (bool, int, str)):
        out['value'] = value
    elif isinstance(value, float) and math.isfinite(value):
        out['value'] = value
    return out


def names_in(ns):
    return {
        name: type(value).__name__
        for name, value in ns.items()
        if not name.startswith('__') and type(value).__name__ != 'module'
    }


def error_of(error, shown):
    frames = [f for f in traceback.extract_tb(error.__traceback__) if f.filename == shown]
    line = frames[-1].lineno if frames else None
    text = ''.join(traceback.format_exception_only(type(error), error)).strip()
    if frames:
        text = 'Traceback (most recent call last):\n' + ''.join(traceback.format_list(frames)) + text
    return {
        'type': type(error).__name__,
        'message': str(error),
        'line': line,
        'name': getattr(error, 'name', None) if isinstance(error, NameError) else None,
        'shown': text
    }


def comments_in(source):
    found = []
    try:
        for token in tokenize.tokenize(io.BytesIO(source).readline):
            if token.type == tokenize.COMMENT:
                found.append({'line': token.start[0], 'text': token.string[1:].strip()})
    except (tokenize.TokenError, SyntaxError):
        pass
    return found


def task_starts(lines):
    """The line each task's part starts on: its last `# Task N` comment. The list of tasks at the
    top of a file is a run of such comments one under the other, and never starts a part."""
    found = [(number, TASK_LINE.match(text)) for number, text in enumerate(lines, 1)]
    marked = {number for number, match in found if match}
    starts = {}
    for number, match in found:
        if match and number - 1 not in marked and number + 1 not in marked:
            starts[int(match.group(1))] = number
    return starts


def main():
    spec = json.loads(sys.stdin.read())
    sys.stdin = io.StringIO('')
    shown = spec['shown']
    root = os.path.realpath(spec['root'])
    with open(spec['file'], 'rb') as f:
        source = f.read()

    starts = task_starts(source.decode('utf-8', 'replace').splitlines())

    try:
        compile(source, shown, 'exec', dont_inherit=True)
    except (SyntaxError, ValueError) as error:
        line = getattr(error, 'lineno', None)
        above = source.decode('utf-8', 'replace').splitlines()[:max((line or 1) - 1, 0)]
        code = [text for text in above if text.strip() and not text.strip().startswith('#')]
        emit({
            'kind': 'syntax',
            'type': type(error).__name__,
            'message': getattr(error, 'msg', str(error)),
            'line': line,
            'text': (getattr(error, 'text', None) or '').rstrip('\n'),
            'before': code[-1] if code else '',
            'task': max((t for t in starts if starts[t] <= (line or 0)), key=lambda t: starts[t], default=0),
            'shown': ''.join(traceback.format_exception_only(type(error), error)).strip()
        })
        return

    if spec.get('comments'):
        emit({'kind': 'comments', 'list': comments_in(source)})

    tree = ast.parse(source, shown)
    for name, value in (spec.get('given') or {}).items():
        line = next(
            (s for s in tree.body if isinstance(s, ast.Assign) and len(s.targets) == 1
             and isinstance(s.targets[0], ast.Name) and s.targets[0].id == name),
            None
        )
        if line is None:
            emit({'kind': 'missing-given', 'name': name})
            return
        line.value = ast.copy_location(ast.Constant(value=value), line.value)
    ast.fix_missing_locations(tree)

    upto = spec.get('upto')
    if upto is not None and upto not in starts:
        emit({'kind': 'missing-task', 'task': upto})
        return

    order = sorted(starts, key=lambda task: starts[task])
    parts = {0: []}
    for task in order:
        parts[task] = []
    for statement in tree.body:
        owner = 0
        for task in order:
            if starts[task] <= statement.lineno:
                owner = task
        parts[owner].append(statement)

    guard(root)
    sys.path.insert(0, os.path.dirname(os.path.abspath(spec['file'])))
    ns = {'__name__': '__main__', '__builtins__': builtins, '__file__': shown}
    wanted = spec.get('names') or []
    for task in [0] + order:
        if task == upto:
            ns.update(spec.get('inject') or {})
        emit({'kind': 'start', 'task': task})
        printed = Printed(task)
        sys.stdout = printed
        error = None
        try:
            exec(compile(ast.Module(body=parts[task], type_ignores=[]), shown, 'exec'), ns)
        except BaseException as caught:
            error = error_of(caught, shown)
        finally:
            sys.stdout = channel
        emit({
            'kind': 'part',
            'task': task,
            'printed': printed.text(),
            'error': error,
            'values': {name: value_of(ns[name]) for name in wanted if name in ns},
            'names': names_in(ns)
        })
        if task == upto:
            break
    emit({'kind': 'done'})


main()
