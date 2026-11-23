// Tickets at the gangway. Run this file in the terminal with: java Gangway.java
//
// 1. Find the tickets scanned twice
// 2. Find who came on both days
// 3. List the free seats on a boat

import java.util.*;

public class Gangway {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        List<String> scans = List.of("T-41", "T-07", "T-41", "T-19", "T-07");
        // System.out.println("Scanned twice: " + Scans.scannedTwice(scans));

        Set<String> saturday = new HashSet<>(List.of("Ishbel", "Torquil", "Seonag", "Innes"));
        Set<String> sunday = new HashSet<>(List.of("Seonag", "Murdo", "Ishbel"));
        // System.out.println("Both days: " + Days.onBoth(saturday, sunday));

        // Set<Seat> taken = new HashSet<>();
        // taken.add(new Seat("Gannet", 2));
        // taken.add(new Seat("Gannet", 3));
        // System.out.println("Free on the Gannet: " + Plan.freeSeats(taken, "Gannet", 5));
    }
}

// Task 1: Find the tickets scanned twice
// Write a class Scans with a method static Set<String> scannedTwice(List<String> scans). It
// gives back the ticket codes scanned more than once, each code once, in the order of their
// second scan. scans stays as it is.

// Task 2: Find who came on both days
// Write a class Days with a method static Set<String> onBoth(Set<String> first,
// Set<String> second). It gives back the names in both sets, in alphabetical order. first and
// second stay as they are.

// Task 3: List the free seats on a boat
// Write a record Seat with a String boat and an int number, in that order: a record is equal to
// any other with the same parts, as a set needs, with nothing more to write. Then write a class
// Plan with a method static List<Integer> freeSeats(Set<Seat> taken, String boat, int seats).
// The boat's seats are numbered from 1 to seats, and taken holds the seats taken on every boat.
// It gives back the numbers of the boat's seats that are not taken, smallest first.
