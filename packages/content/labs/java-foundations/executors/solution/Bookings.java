// The morning's bookings, confirmed with the harbour office by a pool of threads. Run this file
// in the terminal with: java Bookings.java
//
// 1. Confirm the bookings with a pool of three
// 2. Keep going past a booking that fails
// 3. Keep one pool open for the day

import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public class Bookings {
    public static void main(String[] args) throws InterruptedException, ExecutionException {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        Office office = booking -> {
            Thread.sleep(1000);
            if (booking.contains("bicycles")) {
                throw new IOException("the office line dropped");
            }
            return "Confirmed: " + booking;
        };
        List<String> morning = List.of("Ross family, 4", "Mrs Grant, 1", "School trip, 30", "Two walkers, 2", "Bell ringers, 6", "Fisher, 1");
        long start = System.nanoTime();

        System.out.println(Batch.confirmAll(morning, office));
        System.out.println("Took " + (System.nanoTime() - start) / 1_000_000 + " ms");

        ExecutorService pool = Executors.newFixedThreadPool(3);
        List<String> problems = new ArrayList<>();
        System.out.println(Careful.confirmEach(pool, List.of("Ross family, 4", "Three bicycles, 3", "Mrs Grant, 1"), office, problems));
        System.out.println("Problems: " + problems);
        pool.shutdown();

        Desk desk = new Desk(3);
        System.out.println(desk.confirmAll(morning, office));
        System.out.println(desk.confirmAll(List.of("Late party, 5"), office));
        desk.close();
    }
}

// The harbour office's booking line. confirm takes about a second, and throws an IOException
// when the line drops. Use it as it is.
interface Office {
    String confirm(String booking) throws IOException, InterruptedException;
}

// Task 1: Confirm the bookings with a pool of three
// Write a class Batch with one method, which throws InterruptedException and ExecutionException.
// static List<String> confirmAll(List<String> bookings, Office office) makes a pool of exactly
// three threads, hands it one job per booking that gives back office.confirm(booking), and
// gives back the confirmations in the order of the bookings. A booking that fails reaches the
// caller as the ExecutionException that get throws. Whatever happens, the pool is shut down
// before confirmAll returns.
class Batch {
    static List<String> confirmAll(List<String> bookings, Office office) throws InterruptedException, ExecutionException {
        ExecutorService pool = Executors.newFixedThreadPool(3);
        try {
            List<Future<String>> futures = new ArrayList<>();
            for (String booking : bookings) {
                futures.add(pool.submit(() -> office.confirm(booking)));
            }
            List<String> confirmations = new ArrayList<>();
            for (Future<String> future : futures) {
                confirmations.add(future.get());
            }
            return confirmations;
        } finally {
            pool.shutdown();
        }
    }
}

// Task 2: Keep going past a booking that fails
// Write a class Careful with one method, which throws InterruptedException. static List<String>
// confirmEach(ExecutorService pool, List<String> bookings, Office office, List<String> problems)
// hands the pool it is given one job per booking, as Task 1 does, and gives back the
// confirmations of the bookings that worked, in their order. A booking whose job threw is left
// out, and its problem is added to problems, in the order of the bookings: the booking, a colon
// and a space, then the message of what its job threw, as in "Fisher, 1: the office line
// dropped". The pool belongs to the caller: confirmEach leaves it open.
class Careful {
    static List<String> confirmEach(ExecutorService pool, List<String> bookings, Office office, List<String> problems) throws InterruptedException {
        List<Future<String>> futures = new ArrayList<>();
        for (String booking : bookings) {
            futures.add(pool.submit(() -> office.confirm(booking)));
        }
        List<String> confirmations = new ArrayList<>();
        for (int i = 0; i < futures.size(); i++) {
            try {
                confirmations.add(futures.get(i).get());
            } catch (ExecutionException e) {
                problems.add(bookings.get(i) + ": " + e.getCause().getMessage());
            }
        }
        return confirmations;
    }
}

// Task 3: Keep one pool open for the day
// Write a class Desk that keeps one pool for the whole day. Desk(int threads) makes a pool of
// that many threads. List<String> confirmAll(List<String> bookings, Office office), which
// throws InterruptedException and ExecutionException, hands that pool a job per booking all at
// once with invokeAll and gives back the confirmations in the order of the bookings; a booking
// that fails reaches the caller as the ExecutionException that get throws, and the pool stays
// open. void close() shuts the pool down.
class Desk {
    private final ExecutorService pool;

    Desk(int threads) {
        pool = Executors.newFixedThreadPool(threads);
    }

    List<String> confirmAll(List<String> bookings, Office office) throws InterruptedException, ExecutionException {
        List<Callable<String>> jobs = new ArrayList<>();
        for (String booking : bookings) {
            jobs.add(() -> office.confirm(booking));
        }
        List<String> confirmations = new ArrayList<>();
        for (Future<String> future : pool.invokeAll(jobs)) {
            confirmations.add(future.get());
        }
        return confirmations;
    }

    void close() {
        pool.shutdown();
    }
}
