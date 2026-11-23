// The harbour office's questions. Run this file in the terminal with: java HarbourOffice.java
//
// 1. Name the passengers on one boat
// 2. Find the largest bookings
// 3. Hand over a stream that waits

import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class HarbourOffice {
    public static void main(String[] args) {
        // main is yours: try your types here, and take the // off a group of lines once what
        // it uses is written.
        List<Booking> bookings = List.of(
            new Booking("Torquil", "Gannet", 2),
            new Booking("Ishbel", "Linnet", 4),
            new Booking("Murdo", "Gannet", 1),
            new Booking("Peigi", "Gannet", 6),
            new Booking("Torquil", "Gannet", 3));

        System.out.println(Passengers.namesOn(bookings, "Gannet"));
        System.out.println(Passengers.countOn(bookings, "Gannet"));

        System.out.println(Biggest.largest(bookings, 2));
        System.out.println(Biggest.anyOver(bookings, 5));

        Stream<String> waiting = Later.namesWhere(bookings, b -> b.seats() > 1);
        System.out.println("Nothing asked yet");
        System.out.println(waiting.limit(2).toList());
    }
}

// One booking: who booked, on which boat, and how many seats. Use it as it is.
record Booking(String passenger, String boat, int seats) {
}

// Task 1: Name the passengers on one boat
// Write a class Passengers with two methods, each one stream from bookings to its answer.
// static List<String> namesOn(List<Booking> bookings, String boat) gives back the passengers
// booked on that boat, in alphabetical order, each name once. static long countOn(
// List<Booking> bookings, String boat) gives back how many bookings are on that boat.
// bookings stays as it is.
class Passengers {
    static List<String> namesOn(List<Booking> bookings, String boat) {
        return bookings.stream()
            .filter(b -> b.boat().equals(boat))
            .map(b -> b.passenger())
            .distinct()
            .sorted()
            .toList();
    }

    static long countOn(List<Booking> bookings, String boat) {
        return bookings.stream().filter(b -> b.boat().equals(boat)).count();
    }
}

// Task 2: Find the largest bookings
// Write a class Biggest with two methods, each one stream from bookings to its answer.
// static List<Booking> largest(List<Booking> bookings, int n) gives back the n bookings with
// most seats, most first, bookings with the same seats in the order they came, and all of them
// when there are fewer than n. static boolean anyOver(List<Booking> bookings, int seats) says
// whether any booking is for more than seats seats. bookings stays as it is.
class Biggest {
    static List<Booking> largest(List<Booking> bookings, int n) {
        return bookings.stream()
            .sorted(Comparator.comparing(Booking::seats).reversed())
            .limit(n)
            .toList();
    }

    static boolean anyOver(List<Booking> bookings, int seats) {
        return bookings.stream().anyMatch(b -> b.seats() > seats);
    }
}

// Task 3: Hand over a stream that waits
// Write a class Later with a method static Stream<String> namesWhere(List<Booking> bookings,
// Predicate<Booking> rule). It gives back a stream, not yet finished, of the passengers of the
// bookings the rule says yes to, in the order they came. Nothing is asked of the rule until
// whoever gets the stream asks for an answer, and then no more than that answer needs.
class Later {
    static Stream<String> namesWhere(List<Booking> bookings, Predicate<Booking> rule) {
        return bookings.stream().filter(rule).map(Booking::passenger);
    }
}
