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
#
# Files with blocks (if, loops, functions) add {part_seconds, define, call}. With `part_seconds`,
# a part or call that runs longer, or prints without end, is stopped by itself and the parts after
# it still run. `define` is Python run right before part `upto`, Check's own versions of what
# earlier tasks make. `call` calls a function once part `upto` has run, and reports what it gave
# back and what it printed, apart.
#
# A call with `data` takes lists, tuples, sets and dictionaries as arguments, written in JSON with
# tuples as {"@tuple": [...]} and sets as {"@set": [...]}, and reports what it gave back and what
# each argument holds after the call in the same form (dictionaries as {"@dict": [[key, value]]}),
# so Check compares values, never their printed form, and sees a list the function changed.
import _thread
import ast
import builtins
import io
import json
import math
import os
import re
import signal
import sys
import threading
import time
import tokenize
import traceback

MARK = '@@indent '
MAX_PRINTED = 200000
# With blocks, what one part or call printed is sent back cut to this, so several parts that
# print without end stay within what Check reads. Every task needs far less.
MAX_SENT = 20000
# With blocks, how much more memory than ever before one part or call may take. A loop that
# grows a value without end reaches gigabytes well inside the time limit.
MAX_GROWTH = 512 * 1024 * 1024
TASK_LINE = re.compile(r'\s*#\s*Task\s+(\d+)\b')

channel = sys.stdout

try:
    import resource
except ImportError:
    resource = None


def peak_memory():
    """The most memory this process has held, in bytes, or 0 where Python cannot tell."""
    if resource is None:
        return 0
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return peak if sys.platform == 'darwin' else peak * 1024


def emit(record):
    channel.write(MARK + json.dumps(record) + '\n')
    channel.flush()


def guard(root):
    """Lets the learner's code write only inside the sandbox copy, and start no other program.

    It stops a beginner's accident: an absolute path typed by mistake, a `..` too many, a file
    removed by a wrong name, a link out of the folder, a program started from the file. It is not
    a sandbox. Reading files outside the copy is allowed, and code that sets out to get past it
    can (native code, a process started without an audit event such as multiprocessing on 3.9).
    The learner's file runs on their own computer as their own user either way.
    """
    writes = os.O_WRONLY | os.O_RDWR | os.O_APPEND | os.O_CREAT | os.O_TRUNC
    changes = {
        'os.remove', 'os.rmdir', 'os.mkdir', 'os.rename', 'os.chmod', 'os.chown', 'os.truncate',
        'os.utime', 'os.symlink', 'os.link', 'os.mkfifo', 'os.mknod', 'os.chflags',
        'os.setxattr', 'os.removexattr', 'shutil.rmtree', 'shutil.copyfile', 'shutil.move'
    }
    programs = {
        'subprocess.Popen', 'os.system', 'os.exec', 'os.posix_spawn', 'os.spawn', 'os.fork',
        'os.forkpty', 'os.startfile', 'os.kill', 'os.killpg', 'ctypes.dlopen'
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
            raise PermissionError('Check does not let a program start other programs or load native code')

    sys.addaudithook(hook)


class Stopped(BaseException):
    """Raised inside a part or call that runs too long or prints without end."""

    def __init__(self, why):
        super().__init__(why)
        self.why = why


class Printed(io.TextIOBase):
    """What one part prints. A program that prints without end is stopped: the whole file, or
    with `alone` only this part or call."""

    total = 0

    def __init__(self, task, alone=False):
        self.task = task
        self.alone = alone
        self.size = 0
        self.parts = []

    def writable(self):
        return True

    def write(self, text):
        text = str(text)
        if self.alone:
            self.size += len(text)
            if self.size > MAX_PRINTED:
                raise Stopped('flood')
        else:
            Printed.total += len(text)
            if Printed.total > MAX_PRINTED:
                emit({'kind': 'flood', 'task': self.task})
                os._exit(0)
        self.parts.append(text)
        return len(text)

    def text(self):
        return ''.join(self.parts)


class Watchdog:
    """Stops a part or call that runs longer than `seconds`, or grows its memory by more than
    MAX_GROWTH. One thread, started before any learner code runs, raises Stopped in the main
    thread through its SIGINT handler."""

    def __init__(self, seconds, shown, tree):
        self.seconds = seconds
        self.shown = shown
        self.loops = [n for n in ast.walk(tree) if isinstance(n, (ast.For, ast.While))]
        self.deadline = None
        self.base = 0
        self.why = 'time'
        self.active = False
        self.cond = threading.Condition()
        signal.signal(signal.SIGINT, self.interrupted)
        threading.Thread(target=self.watch, daemon=True).start()

    def interrupted(self, signum, frame):
        if self.active:
            self.active = False
            raise Stopped(self.why)

    def watch(self):
        with self.cond:
            while True:
                if self.deadline is None:
                    self.cond.wait()
                elif self.deadline <= time.monotonic():
                    self.stop('time')
                elif peak_memory() - self.base > MAX_GROWTH:
                    self.stop('memory')
                else:
                    self.cond.wait(min(0.02, self.deadline - time.monotonic()))

    def stop(self, why):
        self.deadline = None
        self.why = why
        _thread.interrupt_main()

    def loop_at(self, line):
        """The first line of the innermost loop around `line`, the same on every run."""
        around = [n.lineno for n in self.loops if line and n.lineno <= line <= n.end_lineno]
        return max(around) if around else None

    def run(self, task, code, ns):
        """Runs `code(ns)` with what it prints kept apart. Returns (result, printed, error,
        stopped), stopped being None or {'why', 'line'}."""
        printed = Printed(task, alone=True)
        sys.stdout = printed
        result = error = stopped = None
        with self.cond:
            self.deadline = time.monotonic() + self.seconds
            self.base = peak_memory()
            self.cond.notify()
        self.active = True
        try:
            result = code(ns)
        except Stopped as caught:
            frames = [f for f in traceback.extract_tb(caught.__traceback__) if f.filename == self.shown]
            line = frames[-1].lineno if frames else None
            stopped = {'why': caught.why, 'line': line, 'loop': self.loop_at(line)}
        except BaseException as caught:
            error = error_of(caught, self.shown)
        finally:
            self.active = False
            with self.cond:
                self.deadline = None
            sys.stdout = channel
        return result, printed, error, stopped


def value_of(value):
    out: dict = {'type': type(value).__name__, 'repr': repr(value)[:300]}
    if value is None or isinstance(value, (bool, int, str)):
        out['value'] = value
    elif isinstance(value, float) and math.isfinite(value):
        out['value'] = value
    return out


MAX_ITEMS = 1000


def encode(value, depth=0):
    """A value as JSON Check can compare: lists as arrays, tuples, sets and dictionaries tagged."""
    if depth > 20:
        return {'@other': type(value).__name__}
    if value is None or type(value) in (bool, int, str):
        return value
    if type(value) is float:
        return {'@float': value if math.isfinite(value) else repr(value)}
    inner = lambda items: [encode(v, depth + 1) for v in items[:MAX_ITEMS]] + (
        [{'@other': 'more'}] if len(items) > MAX_ITEMS else [])
    if type(value) is list:
        return inner(value)
    if type(value) is tuple:
        return {'@tuple': inner(value)}
    if type(value) in (set, frozenset):
        items = inner(list(value))
        return {'@set': sorted(items, key=lambda v: json.dumps(v, sort_keys=True))}
    if type(value) is dict:
        pairs = list(value.items())[:MAX_ITEMS]
        return {'@dict': [[encode(k, depth + 1), encode(v, depth + 1)] for k, v in pairs]}
    return {'@other': type(value).__name__, 'repr': repr(value)[:300]}


def decode(value):
    """Check's JSON arguments as Python values, the other way round from encode."""
    if isinstance(value, list):
        return [decode(v) for v in value]
    if isinstance(value, dict):
        if list(value) == ['@tuple']:
            return tuple(decode(v) for v in value['@tuple'])
        if list(value) == ['@set']:
            return {decode(v) for v in value['@set']}
        if list(value) == ['@dict']:
            return {decode(k): decode(v) for k, v in value['@dict']}
        return {k: decode(v) for k, v in value.items()}
    return value


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


def kind_of(node):
    """The kind of value a given line holds, as far as Check cares: a number, text, True or False,
    None, or something else such as `7,5` (two numbers) or an expression."""
    try:
        value = ast.literal_eval(node)
    except (ValueError, TypeError, SyntaxError, MemoryError, RecursionError):
        return 'other'
    if value is None:
        return 'none'
    if isinstance(value, bool):
        return 'bool'
    if isinstance(value, (int, float)):
        return 'number'
    return 'text' if isinstance(value, str) else 'other'


def changed(mine, checks):
    """Whether a given line no longer holds the kind of value Check puts there. None stands for
    a value not known yet, so it may become anything."""
    return mine == 'other' or (mine != checks and 'none' not in (mine, checks))


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


def called(watchdog, task, call, ns):
    """Calls the function `call['name']` with Check's own arguments."""
    record = {'kind': 'call', 'task': task, 'names': names_in(ns)}
    fn = ns.get(call['name'])
    if fn is None:
        record['missing'] = True
        return record
    if not callable(fn):
        record['type'] = type(fn).__name__
        return record
    args = call.get('args') or []
    kwargs = call.get('kwargs') or {}
    if call.get('data'):
        args = decode(args)
        kwargs = decode(kwargs)
    result, printed, error, stopped = watchdog.run(task, lambda ns: fn(*args, **kwargs), ns)
    record.update({
        'printed': printed.text()[:MAX_SENT],
        'error': error,
        'stopped': stopped,
        'returned': None if error or stopped else value_of(result)
    })
    if call.get('data'):
        record['after'] = [encode(a) for a in args]
        record['after_repr'] = [repr(a)[:300] for a in args]
        if record['returned']:
            record['returned']['data'] = encode(result)
            record['returned']['same'] = next((i for i, a in enumerate(args) if a is result), None)
    return record


def main():
    spec = json.loads(sys.stdin.buffer.read())
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
        if changed(kind_of(line.value), kind_of(ast.Constant(value=value))):
            emit({'kind': 'changed-given', 'name': name, 'line': line.lineno})
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

    watchdog = Watchdog(spec['part_seconds'], shown, tree) if spec.get('part_seconds') else None
    if watchdog:
        made = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)}
        made |= {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
        made |= {a.arg for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) for a in n.args.args}
        defs = any(isinstance(n, ast.FunctionDef) for n in ast.walk(tree))
        emit({'kind': 'made', 'list': sorted(made), 'defs': defs})
    guard(root)
    sys.path.insert(0, os.path.dirname(os.path.abspath(spec['file'])))
    ns = {'__name__': '__main__', '__builtins__': builtins, '__file__': shown}
    wanted = spec.get('names') or []
    for task in [0] + order:
        if task == upto:
            ns.update(spec.get('inject') or {})
            if spec.get('define'):
                exec(compile(spec['define'], '<check>', 'exec'), ns)
        emit({'kind': 'start', 'task': task})
        if watchdog:
            module = compile(ast.Module(body=parts[task], type_ignores=[]), shown, 'exec')
            _, printed, error, stopped = watchdog.run(task, lambda ns: exec(module, ns), ns)
            emit({
                'kind': 'part',
                'task': task,
                'printed': printed.text()[:MAX_SENT],
                'error': error,
                'stopped': stopped,
                'values': {name: value_of(ns[name]) for name in wanted if name in ns},
                'names': names_in(ns)
            })
            if task == upto:
                if spec.get('call'):
                    emit(called(watchdog, task, spec['call'], ns))
                break
            continue
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
