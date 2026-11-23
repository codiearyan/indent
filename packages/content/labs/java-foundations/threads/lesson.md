# A second thread

## What you will be able to do

Every program so far did one thing at a time. This last part of the repo is about doing several things at once, and what goes wrong when you do. By the end of this issue you will be able to:

- start a second thread that does its work while `main` goes on
- wait for a thread to end, and read what it made
- deal with `InterruptedException`, the checked exception that comes with waiting
- stop a thread that would otherwise keep the program running for ever

## The request from Bridie

> **Bridie:** The hut computer reads the departure out over the quay speaker now, and while it reads, it does nothing else. A minute of announcement and the queue is out the door. Then at closing it counts each boat's passenger list one after the other, and the bell on the quay only rings if I stand there pressing it. Can it do these things while I sell tickets?

All three tasks are in `BusyHut.java`.

## A second thread

A thread is a line of work inside a program. `main` runs on one, called `main`. To start another, make a `Thread` and hand it the work to do, as a lambda with no parameters that gives back nothing. That lambda is a `Runnable`, a functional interface like the ones part 7 showed, with one method, `void run()`:

```java
Thread labeller = new Thread(() -> {
    for (String jar : jars) {
        System.out.println("Label for " + jar);
    }
});
labeller.start();
System.out.println("Stall open");
```

Making the `Thread` runs nothing. `start()` gives it a life of its own and comes back at once: from then on two threads print. The trap beside it is `labeller.run()`, an ordinary method call: the work runs right there, on the thread that called it, and `Stall open` waits for every label. It looks right and has no second thread at all.

A thread can be started only once. Newer versions of Java add much lighter threads, made by the thousand; this repo uses Java 17, where every thread is a real one, and the ideas here are the same.

## Two threads, no promised order

Run it a few times: sometimes `Stall open` comes first, sometimes after a label or two. Java promises nothing about which line of one thread comes before which line of another; only the order inside one thread is kept. Whatever needs an order, put it on one thread.

## Waiting for a thread

`labeller.join()` waits until that thread has ended. After it, what the thread made, such as a number it put in an array, can be read safely; before it, the thread may not have got there yet.

To have several threads work at once, start them all first and wait for them after. A `join` inside the loop that starts them waits for each before starting the next, and the threads run one after another, as with no threads at all.

`join` does not compile on its own:

```
Jam.java:5: error: unreported exception InterruptedException; must be caught or declared to be thrown
        labeller.join();
                     ^
```

`InterruptedException` is a checked exception, as part 5 showed for `IOException`. It means another thread asked this one to stop while it was waiting. When a method waits and can do nothing sensible about being stopped, it says so on its first line, `throws InterruptedException`, and lets the caller decide. `main` can say it too.

## Asleep, interrupted and still alive

`Thread.sleep(500)` pauses the thread it runs on for half a second, and throws `InterruptedException` too. A thread that loops and sleeps never ends by itself, and a program ends only when its last thread has ended. `main` can reach its last line, print it, and still the terminal shows no prompt, because a thread is still going. Press Ctrl+C to stop such a program; a prompt that does not come back after the last line printed means a thread is still alive somewhere.

A thread cannot be stopped from outside. It is asked: `labeller.interrupt()` sets a flag on it, and if it is sleeping or waiting, the sleep throws `InterruptedException` at once. What the thread does with it decides everything:

```java
try {
    while (true) {
        stirJam();
        Thread.sleep(60000);
    }
} catch (InterruptedException e) {
    // asked to stop: the loop is over, and the thread ends here
}
```

The catch is outside the loop, so an interrupt ends the loop. A `try` with an empty `catch` around the sleep alone, inside the loop, swallows the news: the thread wakes and goes on stirring for ever. Throwing the exception clears the flag, so a catch that cannot end the work should at least set it again, with `Thread.currentThread().interrupt()`, for the code around it to see. Whoever asked a thread to stop and then needs it gone calls `join` after `interrupt`.

## Your work in this issue

Open `BusyHut.java`. `Speaker`, `Manifest` and `Bell` are given above the tasks; use them as they are. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java BusyHut.java`. Each task is a class under its own `// Task` comment. Check hands your methods speakers, manifests and bells of its own, which decide the order things happen in, so it sees what your terminal may show only now and then.
