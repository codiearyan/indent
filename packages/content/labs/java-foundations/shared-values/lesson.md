# A value two threads share

## What you will be able to do

Two threads that change the same value are where programs with threads go wrong, and only sometimes, which makes it worse. By the end of this issue you will be able to:

- see why two threads adding to one number lose some of the adds
- guard a value with `synchronized`, on a method or on a block
- count safely with an `AtomicInteger`, without a lock
- keep the locked part of a method as small as it can be

## The request from Bridie

> **Bridie:** Diarmid opened the pier window on Saturday, and both windows sell into the one program. That evening the count said 1,871 tickets and the stubs said 2,000. On Sunday it was short by a different number. Neither of us lost a stub. And two tickets came out with the same number.

All three tasks are in `PierWindow.java`. Run it first: the old count comes up short, by a different number each time.

## Why count++ is three steps

`count++` looks like one step. To the computer it is three: read the value, add one, write the value back. With one thread that makes no difference. With two:

| Hut thread    | Pier thread   | count |
| ------------- | ------------- | ----- |
| reads 41      |               | 41    |
|               | reads 41      | 41    |
| writes 42     |               | 42    |
|               | writes 42     | 42    |

Two tickets sold, and the count went up by one: a lost update. It happens only when two threads meet in the middle of those steps, so a run may lose none, and a program can pass every try in the terminal and still be wrong. `count += tickets` is the same three steps, and so is `total = total.add(fare)` on a shared `BigDecimal`.

Marking the field `volatile` makes each read see the latest write, and that is all: read, add and write are still three steps, and the update is still lost.

## synchronized

Every object in Java has a lock, and only one thread can hold it at a time. A method marked `synchronized` takes its object's lock before it runs and lets go when it returns:

```java
class Shelf {
    private int jars;

    synchronized void stock(int more) {
        jars += more;
    }

    synchronized int jars() {
        return jars;
    }
}
```

A second thread calling `stock` on the same shelf waits until the first has left, so read, add and write happen with nobody in between. The method that only reads takes the lock too, or it may see an old value. Every place that touches the value takes the same lock. A lock on something else guards nothing: `synchronized (new Object())` makes a new lock every time, and every thread gets its own.

Two threads that each hold one lock and wait for the other's wait for ever. That is a deadlock: the program stops and never ends. You will not need two locks in this issue. `wait` and `notify`, which you may meet in older code, may be called only by a thread that holds the object's lock, or Java throws `IllegalMonitorStateException: current thread is not owner`. A `ReentrantLock`, from `java.util.concurrent.locks`, does the same job with `lock()` and `unlock()` calls, for rare cases that need more; reach for `synchronized`.

## AtomicInteger

For a single number there is a type that needs no lock at all. An `AtomicInteger` from `java.util.concurrent.atomic` does read, add and write as one step no other thread can come between:

| Call                  | What it does, in one step                   |
| --------------------- | ------------------------------------------- |
| `incrementAndGet()`   | adds 1, gives back the new value            |
| `getAndIncrement()`   | adds 1, gives back the value before         |
| `addAndGet(n)`        | adds n, gives back the new value            |
| `get()` and `set(v)`  | reads, and writes: one step each            |

The safety is only inside one call. `jars.set(jars.get() + 1)` is two calls, and the lost update is back between them. Reading again after the add, `jars.incrementAndGet(); return jars.get();`, may read another thread's add as well.

## Keeping the locked part small

While one thread holds a lock, every other thread that wants it waits. So lock the lines that touch the shared value and nothing else. A slow job, such as weighing a jar on the scales, belongs outside:

```java
void weighAndRecord(Jar jar) {
    int grams = scales.weigh(jar);
    synchronized (this) {
        totalGrams += grams;
    }
}
```

A `synchronized` block names the object whose lock it takes; `this` takes the same lock as the `synchronized` methods of the class. Everything that reads or writes the value goes inside the block. Working out the new value outside it and only storing it inside, `int next = totalGrams + grams;` and then `synchronized (this) { totalGrams = next; }`, is the lost update again.

## Your work in this issue

Open `PierWindow.java`. `OldCount` and `Printer` are given above the tasks; use them as they are. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java PierWindow.java`. Check holds the lock of your objects itself, and makes a change of its own while your thread waits, so a lost update shows every time; for the `AtomicInteger` it runs many rounds of threads at once.
