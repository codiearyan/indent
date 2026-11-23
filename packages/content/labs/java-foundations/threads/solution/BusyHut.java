// The hut computer, doing more than one thing at a time. Run this file in the terminal with:
// java BusyHut.java
//
// 1. Read the announcement on a thread of its own
// 2. Count every boat's list at once
// 3. Ring the quay bell until the hut closes

import java.util.*;

public class BusyHut {
    public static void main(String[] args) throws InterruptedException {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        Speaker speaker = line -> {
            pause(400);
            System.out.println("Speaker: " + line);
        };
        List<String> announcement = List.of("The Linnet leaves for the Corran side at ten.", "Bicycles go on first.", "Mind the gap at the gangway.");

        Thread reading = Announcer.announce(announcement, speaker);
        System.out.println("Hut: selling a ticket while the speaker reads.");
        reading.join();

        Manifest linnet = () -> slowCount(23);
        Manifest gannet = () -> slowCount(9);
        System.out.println("Passengers today: " + Counting.total(List.of(linnet, gannet)));

        Bell bell = () -> System.out.println("Bell: ding");
        Thread ringer = Ringer.start(bell, 300);
        pause(1000);
        Ringer.stop(ringer);
        System.out.println("Hut: closed.");
    }

    // Waits a while, as the speaker and the counting take time. Use it as it is.
    static void pause(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    static int slowCount(int passengers) {
        pause(500);
        return passengers;
    }
}

// The speaker on the quay: it reads out one line at a time. Use it as it is.
interface Speaker {
    void say(String line);
}

// One boat's passenger list, which takes a while to count. Use it as it is.
interface Manifest {
    int count();
}

// The bell on the quay. Use it as it is.
interface Bell {
    void ring();
}

// Task 1: Read the announcement on a thread of its own
// Write a class Announcer with one method. static Thread announce(List<String> lines, Speaker
// speaker) makes a new thread that hands each line to speaker.say, in order, starts it, and gives
// it back at once, without waiting for the lines to be said.
class Announcer {
    static Thread announce(List<String> lines, Speaker speaker) {
        Thread reader = new Thread(() -> {
            for (String line : lines) {
                speaker.say(line);
            }
        });
        reader.start();
        return reader;
    }
}

// Task 2: Count every boat's list at once
// Write a class Counting with one method, which throws InterruptedException. static int
// total(List<Manifest> manifests) starts one thread for each manifest, all of them before it
// waits for any. Each thread calls count() on its manifest once; give each thread a place of its
// own for its answer. Then total waits for every thread to end and gives back the counts added up.
class Counting {
    static int total(List<Manifest> manifests) throws InterruptedException {
        int[] counts = new int[manifests.size()];
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < manifests.size(); i++) {
            int at = i;
            Thread counter = new Thread(() -> counts[at] = manifests.get(at).count());
            counter.start();
            threads.add(counter);
        }
        for (Thread counter : threads) {
            counter.join();
        }
        int total = 0;
        for (int count : counts) {
            total += count;
        }
        return total;
    }
}

// Task 3: Ring the quay bell until the hut closes
// Write a class Ringer with two methods. static Thread start(Bell bell, long everyMillis) starts
// a thread that rings the bell, sleeps everyMillis milliseconds, and does it again, until the
// thread is interrupted, and gives the thread back at once. Interrupted while it sleeps or while
// it rings, the thread ends. static void stop(Thread ringer), which throws InterruptedException,
// interrupts the thread and waits for it to end.
class Ringer {
    static Thread start(Bell bell, long everyMillis) {
        Thread ringer = new Thread(() -> {
            try {
                while (true) {
                    bell.ring();
                    Thread.sleep(everyMillis);
                }
            } catch (InterruptedException e) {
                // Interrupted: the hut is closing, so the thread ends here.
            }
        });
        ringer.start();
        return ringer;
    }

    static void stop(Thread ringer) throws InterruptedException {
        ringer.interrupt();
        ringer.join();
    }
}
