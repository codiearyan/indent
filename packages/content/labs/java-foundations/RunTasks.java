// Run by grading.mjs as `java RunTasks.java`, never by a learner. It reads units from standard
// input, compiles each in memory with --release 17 and runs every main that compiled, all in this
// one JVM, because starting Java is slow. Nothing is written to disk. Each run has its own output,
// no typing, and a shared deadline; one JSON line per unit is printed as it finishes.
//
// Input: a line `KEY <key>`, then, repeated, a line `UNIT <id> <class> <chars>` and exactly <chars>
// characters of source. Every result line carries the key, which learner code never sees.
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.FileObject;
import javax.tools.ForwardingJavaFileManager;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.StandardLocation;
import javax.tools.ToolProvider;

public class RunTasks {
    static final long DEADLINE_MS = 4000;
    static final int MAX_OUTPUT = 20000;
    private static final PrintStream REAL_OUT = System.out;
    private static String key = "";

    static final class Unit {
        String id;
        String className;
        String source;
        boolean compiled;
        final List<String> errors = new ArrayList<>();
        Map<String, byte[]> classes = new HashMap<>();
        final Capture out = new Capture();
        final Capture err = new Capture();
        final List<String> reads = new ArrayList<>();
        String exception;
        boolean input;
        volatile boolean done;
        volatile boolean exited;
        boolean reported;
        Thread thread;
    }

    static final class Capture {
        final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        boolean flooded;

        synchronized void write(byte[] b, int off, int len) {
            int room = MAX_OUTPUT - bytes.size();
            if (len > room) flooded = true;
            if (room > 0) bytes.write(b, off, Math.min(len, room));
        }

        synchronized String text() {
            return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    static final InheritableThreadLocal<Unit> CURRENT = new InheritableThreadLocal<>();

    static final class Router extends OutputStream {
        final boolean error;

        Router(boolean error) {
            this.error = error;
        }

        Capture target() {
            Unit unit = CURRENT.get();
            return unit == null ? null : error ? unit.err : unit.out;
        }

        @Override
        public void write(int b) {
            write(new byte[] { (byte) b }, 0, 1);
        }

        @Override
        public void write(byte[] b, int off, int len) {
            Capture c = target();
            if (c != null) c.write(b, off, len);
        }
    }

    static final class Source extends SimpleJavaFileObject {
        final String text;

        Source(String fileName, String text) {
            super(URI.create("string:///" + fileName), Kind.SOURCE);
            this.text = text;
        }

        @Override
        public CharSequence getCharContent(boolean ignoreEncodingErrors) {
            return text;
        }
    }

    static final class ClassOut extends SimpleJavaFileObject {
        final String name;
        final Map<String, byte[]> into;

        ClassOut(String name, Map<String, byte[]> into) {
            super(URI.create("mem:///" + name.replace('.', '/') + ".class"), Kind.CLASS);
            this.name = name;
            this.into = into;
        }

        @Override
        public OutputStream openOutputStream() {
            return new ByteArrayOutputStream() {
                @Override
                public void close() {
                    into.put(name, toByteArray());
                }
            };
        }
    }

    static final class Loader extends ClassLoader {
        final Map<String, byte[]> classes;

        Loader(Map<String, byte[]> classes) {
            super(RunTasks.class.getClassLoader());
            this.classes = classes;
        }

        // Child first: a class file the learner compiled in the workspace (the JVM's working folder
        // is a copy of it) must never stand in for the source Check just compiled.
        @Override
        protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
            if (!classes.containsKey(name)) return super.loadClass(name, resolve);
            synchronized (getClassLoadingLock(name)) {
                Class<?> c = findLoadedClass(name);
                if (c == null) c = findClass(name);
                if (resolve) resolveClass(c);
                return c;
            }
        }

        @Override
        protected Class<?> findClass(String name) throws ClassNotFoundException {
            byte[] b = classes.get(name);
            if (b == null) throw new ClassNotFoundException(name);
            return defineClass(name, b, 0, b.length);
        }
    }

    public static void main(String[] args) throws Exception {
        if (Runtime.version().feature() < 17) {
            REAL_OUT.println("{\"fatal\":\"old\",\"version\":" + json(String.valueOf(Runtime.version().feature())) + "}");
            return;
        }
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            REAL_OUT.println("{\"fatal\":\"nocompiler\"}");
            return;
        }
        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        List<Unit> units = parse(input);
        StandardJavaFileManager standard = compiler.getStandardFileManager(null, Locale.ENGLISH, StandardCharsets.UTF_8);
        // Nothing from the working folder: each unit compiles from its own source and the JDK alone.
        standard.setLocation(StandardLocation.CLASS_PATH, List.of());
        standard.setLocation(StandardLocation.SOURCE_PATH, List.of());
        for (Unit unit : units) compile(compiler, standard, unit);

        System.setIn(new ByteArrayInputStream(new byte[0]));
        System.setOut(new PrintStream(new Router(false), true, StandardCharsets.UTF_8));
        System.setErr(new PrintStream(new Router(true), true, StandardCharsets.UTF_8));
        System.getProperties().put("indent.read", (Consumer<String>) text -> {
            Unit unit = CURRENT.get();
            if (unit != null) synchronized (unit.reads) { unit.reads.add(text); }
        });

        for (Unit unit : units) {
            if (!unit.compiled) {
                report(unit, false);
                continue;
            }
            unit.thread = new Thread(() -> run(unit), "main");
            unit.thread.setDaemon(true);
        }
        end = System.currentTimeMillis() + DEADLINE_MS;
        // A learner's System.exit ends this JVM: name the unit that called it, and still run and
        // report every other unit. The hook is in place before any learner code starts.
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            for (Unit unit : units) {
                if (unit.thread != null && exiting(unit.thread)) unit.exited = true;
            }
            finish(units);
        }));
        for (Unit unit : units) start(unit);
        finish(units);
        REAL_OUT.flush();
        Runtime.getRuntime().halt(0);
    }

    static volatile long end;

    // Once, from main or from the hook: a unit another unit's System.exit overtook still runs.
    static void start(Unit unit) {
        if (unit.thread == null) return;
        synchronized (unit) {
            if (unit.thread.getState() == Thread.State.NEW) unit.thread.start();
        }
    }

    static void finish(List<Unit> units) {
        for (Unit unit : units) {
            if (unit.thread == null) continue;
            start(unit);
            if (!unit.exited) {
                try {
                    unit.thread.join(Math.max(1, end - System.currentTimeMillis()));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            if (!unit.done && exiting(unit.thread)) unit.exited = true;
            report(unit, !unit.done && !unit.exited);
        }
    }

    static boolean exiting(Thread thread) {
        for (StackTraceElement frame : thread.getStackTrace()) {
            if (frame.getClassName().equals("java.lang.Shutdown") || (frame.getClassName().equals("java.lang.Runtime") && frame.getMethodName().equals("exit"))) return true;
        }
        return false;
    }

    static List<Unit> parse(String input) {
        List<Unit> units = new ArrayList<>();
        int at = 0;
        if (input.startsWith("KEY ")) {
            int eol = input.indexOf('\n');
            key = input.substring(4, eol).trim();
            at = eol + 1;
        }
        while (at < input.length()) {
            int eol = input.indexOf('\n', at);
            String[] head = input.substring(at, eol).trim().split(" ");
            int length = Integer.parseInt(head[3]);
            Unit unit = new Unit();
            unit.id = head[1];
            unit.className = head[2];
            unit.source = input.substring(eol + 1, eol + 1 + length);
            units.add(unit);
            at = eol + 1 + length;
            while (at < input.length() && input.charAt(at) == '\n') at++;
        }
        return units;
    }

    static void compile(JavaCompiler compiler, StandardJavaFileManager standard, Unit unit) {
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        JavaFileManager memory = new ForwardingJavaFileManager<JavaFileManager>(standard) {
            @Override
            public JavaFileObject getJavaFileForOutput(Location location, String name, JavaFileObject.Kind kind, FileObject sibling) {
                return new ClassOut(name, unit.classes);
            }
        };
        List<String> options = List.of("--release", "17", "-proc:none", "-Xlint:none", "-Xmaxerrs", "20");
        Source source = new Source(unit.className + ".java", unit.source);
        unit.compiled = compiler.getTask(null, memory, diagnostics, options, null, List.of(source)).call();
        for (Diagnostic<? extends JavaFileObject> d : diagnostics.getDiagnostics()) {
            if (d.getKind() != Diagnostic.Kind.ERROR) continue;
            unit.errors.add("{\"line\":" + d.getLineNumber() + ",\"col\":" + d.getColumnNumber()
                + ",\"code\":" + json(d.getCode()) + ",\"message\":" + json(d.getMessage(Locale.ENGLISH)) + "}");
        }
    }

    static void run(Unit unit) {
        CURRENT.set(unit);
        try {
            Class<?> main = new Loader(unit.classes).loadClass(unit.className);
            Method m = main.getMethod("main", String[].class);
            m.invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause();
            unit.exception = trace(cause, unit.className);
            for (StackTraceElement frame : cause.getStackTrace()) {
                if (frame.getClassName().startsWith("java.util.Scanner")) unit.input = true;
            }
        } catch (Throwable e) {
            unit.exception = "Check could not start main: " + e;
        } finally {
            System.out.flush();
            System.err.flush();
            unit.done = true;
        }
    }

    // As the java launcher prints it, without the frames of this runner.
    static String trace(Throwable e, String className) {
        StackTraceElement[] frames = e.getStackTrace();
        int last = -1;
        for (int i = 0; i < frames.length; i++) {
            String c = frames[i].getClassName();
            if (c.equals(className) || c.startsWith(className + "$")) last = i;
        }
        StringBuilder b = new StringBuilder("Exception in thread \"main\" ").append(e);
        for (int i = 0; i <= last; i++) b.append("\n\tat ").append(frames[i]);
        return b.toString();
    }

    static void report(Unit unit, boolean timedOut) {
        synchronized (unit) {
            if (unit.reported) return;
            unit.reported = true;
        }
        StringBuilder b = new StringBuilder("{\"key\":").append(json(key)).append(",\"id\":").append(json(unit.id));
        b.append(",\"compiled\":").append(unit.compiled);
        b.append(",\"errors\":[").append(String.join(",", unit.errors)).append("]");
        if (unit.compiled) {
            List<String> reads;
            synchronized (unit.reads) { reads = new ArrayList<>(unit.reads); }
            List<String> quoted = new ArrayList<>();
            for (String r : reads) quoted.add(json(r));
            b.append(",\"stdout\":").append(json(unit.out.text()));
            b.append(",\"stderr\":").append(json(unit.err.text()));
            b.append(",\"reads\":[").append(String.join(",", quoted)).append("]");
            b.append(",\"exception\":").append(unit.exception == null ? "null" : json(unit.exception));
            b.append(",\"timedOut\":").append(timedOut);
            b.append(",\"flooded\":").append(unit.out.flooded || unit.err.flooded);
            b.append(",\"input\":").append(unit.input);
            b.append(",\"exited\":").append(unit.exited);
        }
        b.append("}");
        synchronized (REAL_OUT) {
            REAL_OUT.println(b);
            REAL_OUT.flush();
        }
    }

    static String json(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default:
                    if (c < 0x20 || c > 0x7e) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        return b.append('"').toString();
    }
}
