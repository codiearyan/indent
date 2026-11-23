// The season report for the council. Run this file in the terminal with: java SeasonReport.java
//
// 1. Add up the season's seats
// 2. Count the bookings per boat, and write the names in a line
// 3. Answer when there may be no answer

import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class SeasonReport {
    public static void main(String[] args) {
        // main is yours: try your types here, and take the // off a group of lines once what
        // it uses is written.
        List<Booking> season = List.of(
            new Booking("Ishbel", "Gannet", 2),
            new Booking("Torquil", "Linnet", 5),
            new Booking("Peigi", "Gannet", 4),
            new Booking("Murdo", "Gannet", 1));

        // System.out.println(Totals.seats(season) + " seats, " + Totals.average(season) + " a booking, at most " + Totals.most(season));

        // System.out.println(Season.bookingsPerBoat(season));
        // System.out.println(Season.namesLine(season));

        // System.out.println(Lookup.largestOn(season, "Gannet"));
        // System.out.println(Lookup.largestOn(season, "Curlew"));
        // System.out.println(Lookup.firstOn(season, "Linnet") + ", " + Lookup.firstOn(season, "Curlew"));
    }
}

// One booking: who booked, on which boat, and how many seats. Use it as it is.
record Booking(String passenger, String boat, int seats) {
}

// Task 1: Add up the season's seats
// Write a class Totals with three methods, each one stream from bookings to its answer.
// static int seats(List<Booking> bookings) gives back all the seats booked, added up.
// static double average(List<Booking> bookings) gives back the seats of a booking on average,
// and 0 when there are no bookings. static int most(List<Booking> bookings) gives back the most
// seats in one booking, and 0 when there are no bookings.

// Task 2: Count the bookings per boat, and write the names in a line
// Write a class Season with two methods, each one stream from bookings to its answer.
// static Map<String, Long> bookingsPerBoat(List<Booking> bookings) gives back a map from each
// boat to the number of its bookings. static String namesLine(List<Booking> bookings) gives
// back the passengers in the order they came, with a comma and a space between two names, as
// in Ishbel, Torquil, and nothing at either end.

// Task 3: Answer when there may be no answer
// Write a class Lookup with two methods. static Optional<Booking> largestOn(List<Booking>
// bookings, String boat) gives back the booking with most seats on that boat, or an empty
// Optional when that boat has none. static String firstOn(List<Booking> bookings, String boat)
// gives back the passenger of the first booking on that boat, or "nobody" when it has none.
