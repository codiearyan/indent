// Ossian's evening tally. Run this file in the terminal with: java Tally.java
//
// 1. Count the tickets for each boat
// 2. Write the tally in the order of the boats' names
// 3. Look up the seats left on a sailing

import java.util.*;

public class Tally {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        List<String> tickets = List.of("Gannet", "Linnet", "Gannet", "Curlew", "Gannet", "Linnet");
        // Map<String, Integer> counts = Counts.byBoat(tickets);
        // System.out.println(counts);

        // for (String line : Report.lines(counts)) {
        //     System.out.println(line);
        // }

        // Map<Sailing, Integer> booked = new HashMap<>();
        // booked.put(new Sailing("Gannet", 9), 8);
        // System.out.println("Gannet at 9: " + Seats.left(booked, new Sailing("Gannet", 9), 12) + " left");
        // System.out.println("Linnet at 9: " + Seats.left(booked, new Sailing("Linnet", 9), 12) + " left");
    }
}

// Task 1: Count the tickets for each boat
// Write a class Counts with a method static Map<String, Integer> byBoat(List<String> tickets).
// Each ticket is the name of a boat. It gives back a new map from each boat on the list to
// the number of its tickets. tickets stays as it is.

// Task 2: Write the tally in the order of the boats' names
// Write a class Report with a method static List<String> lines(Map<String, Integer> counts).
// It gives back one line per boat, as in Gannet: 3, in alphabetical order of the boats' names,
// whatever order the map keeps them in. counts stays as it is.

// Task 3: Look up the seats left on a sailing
// Write a record Sailing with a String boat and an int hour, in that order. Then write a class
// Seats with a method static int left(Map<Sailing, Integer> booked, Sailing sailing,
// int capacity): the capacity less the places booked on that sailing. A sailing with nothing
// booked is not in the map at all, and has every seat left.
