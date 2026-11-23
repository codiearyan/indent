# A pool of threads and their futures

## What you will be able to do

A thread per job works for two or three jobs. For forty, Java has a pool of threads that takes jobs and gives back their answers. By the end of this issue you will be able to:

- make a pool of a fixed number of threads and hand it jobs that give back an answer
- read each answer from its future, and know what `get` throws when a job failed
- hand a pool a whole list of jobs at once
- shut a pool down, and see what happens when you forget

## The request from Bridie

> **Bridie:** Every morning the harbour office sends the day's bookings, and each one has to be confirmed on their line before the boat fills. One booking takes about a second. Thirty bookings, thirty seconds of me staring at the screen, and the line drops now and then. They say their line takes three calls at once.

All three tasks are in `Bookings.java`. Run it once the first task is written: six bookings take two seconds instead of six.

## A pool and its jobs

An `ExecutorService` is a pool: it keeps a few threads, and each takes the next job waiting, runs it, and takes another. `Executors.newFixedThreadPool(3)` makes a pool of exactly three threads. A job that gives back an answer is a `Callable`: a lambda with no parameters that returns a value, and may throw, checked exceptions included. Hand it to the pool with `submit`:

```java
ExecutorService pool = Executors.newFixedThreadPool(3);
Future<Integer> weighed = pool.submit(() -> scales.weigh(jar));
System.out.println(weighed.get() + " grams");
pool.shutdown();
```

`submit` comes back at once with a `Future`: a promise of the answer. `get()` waits until the job is done and gives back what it returned. So hand over every job first, keeping each future in a list, and call `get` on them after. A `get` straight after each `submit` waits for that job before the next one is handed over: one at a time again, on a pool of three.

Why a pool and not a thread per job? A thousand jobs would make a thousand threads, each costing time and memory, all fighting over the computer. A pool makes its threads once, keeps as many as you chose, and lets the other jobs wait their turn.

## What get throws

`get` says `throws InterruptedException, ExecutionException`. The first you know: the waiting thread was asked to stop. The second means the job threw. The pool catches what a job throws, keeps it in the future, and `get` throws it again wrapped in an `ExecutionException`:

```
Exception in thread "main" java.util.concurrent.ExecutionException: java.lang.NumberFormatException: For input string: "twelve"
	at java.base/java.util.concurrent.FutureTask.report(FutureTask.java:122)
	at java.base/java.util.concurrent.FutureTask.get(FutureTask.java:191)
	at Exec.main(Exec.java:7)
Caused by: java.lang.NumberFormatException: For input string: "twelve"
	at java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
	at java.base/java.lang.Integer.parseInt(Integer.java:662)
	at java.base/java.lang.Integer.parseInt(Integer.java:778)
	at Exec.lambda$main$0(Exec.java:5)
	at java.base/java.util.concurrent.FutureTask.run(FutureTask.java:317)
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1144)
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:642)
	at java.base/java.lang.Thread.run(Thread.java:1583)
```

That came from `pool.submit(() -> Integer.parseInt("twelve"))` and a `get` on line 7. Read it as part 5 showed: the first line names the wrapper and, after it, what was inside; `Caused by:` is the job's own exception, thrown on a thread of the pool, and the line of yours it came from. In code, `e.getCause()` is the job's exception, and `e.getCause().getMessage()` its message. `e.getMessage()` gives the wrapper's message, which starts with the inner class's name. A `try` around one `get` lets the other answers still be read; a `try` around the whole loop stops at the first failed job. And never catch an `ExecutionException` to do nothing: the failed job vanishes.

## Shutting a pool down

A pool's threads wait for jobs for ever, so a pool that is never shut down keeps the program alive after `main` has finished, as the bell did in the last issue. `shutdown()` takes no new jobs, lets the waiting ones run, and lets the threads end once the queue is empty. To make sure it happens even when a `get` throws, put it in a `finally`, as part 5 did for closing a file.

`shutdownNow()` is the hasty one: it drops the jobs still waiting and interrupts the running ones. A future whose job was dropped never gets an answer, and its `get` waits for ever. A pool that is shut down refuses any new job with a `RejectedExecutionException`.

A pool is worth keeping when more work is coming: make one in the morning, hand it list after list, shut it down at closing. A new pool for every list makes new threads every time, which a pool was meant to save.

## invokeAll

When the jobs are a list, `invokeAll` hands over all of them at once and waits until every one is done, then gives back their futures in the same order as the jobs:

```java
List<Callable<Integer>> weighings = new ArrayList<>();
for (Jar jar : jars) {
    weighings.add(() -> scales.weigh(jar));
}
for (Future<Integer> f : pool.invokeAll(weighings)) {
    System.out.println(f.get());
}
```

The futures are all done when `invokeAll` returns, so `get` gives back at once, or throws the `ExecutionException` of a failed job.

## Your work in this issue

Open `Bookings.java`. `Office` is given above the tasks; use it as it is. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java Bookings.java`. Check's office holds every job until your method is waiting for an answer, and counts the pool's threads at that moment, so a pool that runs one job at a time, or more than it should, shows every time; it also looks for threads still alive afterwards.
