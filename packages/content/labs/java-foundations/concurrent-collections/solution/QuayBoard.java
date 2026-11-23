// The counts, the noticeboard and the labels that several threads use at once. Run this file in
// the terminal with: java QuayBoard.java
//
// 1. Count the scans of both gangways
// 2. Post to the noticeboard while it is read
// 3. Make every label with a parallel stream

import java.util.*;
import java.util.concurrent.*;

public class QuayBoard {
    public static void main(String[] args) throws InterruptedException {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        Map<String, Integer> plain = new HashMap<>();
        Thread linnet = new Thread(() -> { for (int i = 0; i < 20000; i++) plain.merge("Linnet", 1, Integer::sum); });
        Thread gannet = new Thread(() -> { for (int i = 0; i < 20000; i++) plain.merge("Linnet", 1, Integer::sum); });
        linnet.start();
        gannet.start();
        linnet.join();
        gannet.join();
        System.out.println("A plain HashMap counted " + plain + ", and 40000 were scanned.");

        ConcurrentMap<String, Integer> counts = Scans.newCounts();
        Thread one = new Thread(() -> { for (int i = 0; i < 20000; i++) Scans.scan(counts, "Linnet", 1); });
        Thread two = new Thread(() -> { for (int i = 0; i < 20000; i++) Scans.scan(counts, "Linnet", 1); });
        one.start();
        two.start();
        one.join();
        two.join();
        System.out.println("Scans: " + counts);

        Board board = new Board();
        board.post("10:00 Linnet to the Corran side");
        board.post("10:30 Gannet round the bay");
        for (String line : board.lines()) {
            board.post("Changed: " + line);
            System.out.println("Board: " + line);
        }
        System.out.println(board.lines());

        Labeller labeller = booking -> {
            System.out.println("Labelling " + booking + " on " + Thread.currentThread().getName());
            return "[" + booking.toUpperCase() + "]";
        };
        System.out.println(Labels.labels(List.of("Ross family", "Mrs Grant", "School trip", "Two walkers"), labeller));
    }
}

// Makes the label for one booking, which takes a while and touches nothing else. Use it as it is.
interface Labeller {
    String label(String booking);
}

// Task 1: Count the scans of both gangways
// Write a class Scans with two methods. static ConcurrentMap<String, Integer> newCounts() gives
// back a new, empty map that several threads can change at once. static void
// scan(ConcurrentMap<String, Integer> counts, String boat, int tickets) adds tickets to the
// boat's count in counts, starting a boat that is not there yet at tickets, in one step that two
// threads scanning for the same boat at once cannot both get in the middle of.
class Scans {
    static ConcurrentMap<String, Integer> newCounts() {
        return new ConcurrentHashMap<>();
    }

    static void scan(ConcurrentMap<String, Integer> counts, String boat, int tickets) {
        counts.merge(boat, tickets, Integer::sum);
    }
}

// Task 2: Post to the noticeboard while it is read
// Write a class Board, the noticeboard. void post(String line) adds a line to the end of the
// board, safe for several threads at once. List<String> lines() gives back the lines posted so
// far, in order, as a list that one thread can go through while other threads go on posting.
class Board {
    private final List<String> lines = new CopyOnWriteArrayList<>();

    void post(String line) {
        lines.add(line);
    }

    List<String> lines() {
        return lines;
    }
}

// Task 3: Make every label with a parallel stream
// Write a class Labels with one method. static List<String> labels(List<String> bookings,
// Labeller labeller) makes the label of every booking with labeller.label, with a parallel
// stream so that the labels are made on several threads at once, and gives back the labels in
// the order of the bookings.
class Labels {
    static List<String> labels(List<String> bookings, Labeller labeller) {
        return bookings.parallelStream().map(labeller::label).toList();
    }
}
