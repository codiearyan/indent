// Two ticket windows, the hut and the pier, selling at once into one program. Run this file in
// the terminal with: java PierWindow.java
//
// 1. Count the tickets of both windows
// 2. Number every ticket once
// 3. Add up the takings, printing outside the lock

import java.math.*;
import java.util.*;
import java.util.concurrent.atomic.*;

public class PierWindow {
    public static void main(String[] args) throws InterruptedException {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        OldCount old = new OldCount();
        Thread hut = new Thread(() -> { for (int i = 0; i < 100000; i++) old.add(1); });
        Thread pier = new Thread(() -> { for (int i = 0; i < 100000; i++) old.add(1); });
        hut.start();
        pier.start();
        hut.join();
        pier.join();
        System.out.println("Old count: " + old.count + " tickets, and 200000 were sold.");

        Sold sold = new Sold();
        Thread hut2 = new Thread(() -> { for (int i = 0; i < 100000; i++) sold.add(1); });
        Thread pier2 = new Thread(() -> { for (int i = 0; i < 100000; i++) sold.add(1); });
        hut2.start();
        pier2.start();
        hut2.join();
        pier2.join();
        System.out.println("Sold: " + sold.count() + " tickets.");

        Numbers numbers = new Numbers(new AtomicInteger(0));
        System.out.println("First tickets: " + numbers.next() + ", " + numbers.next());

        Takings takings = new Takings();
        Printer printer = fare -> System.out.println("Printing a ticket for £" + fare);
        takings.sell(new BigDecimal("3.40"), printer);
        takings.sell(new BigDecimal("1.70"), printer);
        System.out.println("Takings: £" + takings.total());
    }
}

// The count on the clipboard, as the old program kept it. Use it as it is: it shows what goes
// wrong when two threads add to one number.
class OldCount {
    int count;

    void add(int tickets) {
        count += tickets;
    }
}

// The ticket printer at each window, slow as printers are. Use it as it is.
interface Printer {
    void print(BigDecimal fare);
}

// Task 1: Count the tickets of both windows
// Write a class Sold that keeps a count of tickets, 0 at first, safe for both windows at once.
// void add(int tickets) adds tickets to the count, and int count() gives back the count. Both
// methods are synchronized.
class Sold {
    private int count;

    synchronized void add(int tickets) {
        count += tickets;
    }

    synchronized int count() {
        return count;
    }
}

// Task 2: Number every ticket once
// Write a class Numbers that hands out ticket numbers from an AtomicInteger, safe for any number
// of threads at once. Its constructor takes the AtomicInteger, which holds the last number given
// out. int next() adds 1 to it and gives back the new number, so no two calls ever get the
// same number.
class Numbers {
    private final AtomicInteger last;

    Numbers(AtomicInteger last) {
        this.last = last;
    }

    int next() {
        return last.incrementAndGet();
    }
}

// Task 3: Add up the takings, printing outside the lock
// Write a class Takings that keeps the takings, 0 at first. void sell(BigDecimal fare, Printer
// printer) prints the ticket with printer.print(fare), then adds fare to the takings. Only the
// adding is guarded, by a synchronized block on the Takings itself: the printing is outside it,
// so a slow printer at one window never holds up the other. BigDecimal total() gives back the
// takings, and is synchronized.
class Takings {
    private BigDecimal total = BigDecimal.ZERO;

    void sell(BigDecimal fare, Printer printer) {
        printer.print(fare);
        synchronized (this) {
            total = total.add(fare);
        }
    }

    synchronized BigDecimal total() {
        return total;
    }
}
