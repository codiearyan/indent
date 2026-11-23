// Closing time: every boat's till file read at once, and the day's takings for the harbour office.
// Run this file in the terminal with: java HarbourCheck.java
//
// 1. Make a job that reads one till file
// 2. Gather the answers, and the problems
// 3. Check the whole day with a pool of three

import java.io.*;
import java.math.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

public class HarbourCheck {
    public static void main(String[] args) throws Exception {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        List<Path> tills = List.of(Path.of("linnet.csv"), Path.of("gannet.csv"), Path.of("relief-boat.csv"));
        for (Path till : tills) {
            System.out.println(till + ": " + Files.readAllLines(till, StandardCharsets.UTF_8).size() + " lines");
        }

        // Callable<BigDecimal> linnet = Jobs.takings(Path.of("linnet.csv"));
        // System.out.println("Linnet: £" + linnet.call());

        // Map<String, Future<BigDecimal>> answers = new LinkedHashMap<>();
        // answers.put("first", CompletableFuture.completedFuture(new BigDecimal("12.40")));
        // answers.put("second", CompletableFuture.failedFuture(new IOException("the till went quiet")));
        // List<String> problems = new ArrayList<>();
        // System.out.println("Gathered: £" + Results.collect(answers, problems) + ", problems: " + problems);

        // List<String> today = new ArrayList<>();
        // System.out.println("Day: £" + Closing.day(tills, today));
        // System.out.println("Problems: " + today);
    }
}

// One sailing, as a line of a till file holds it. Use it as it is.
record Sailing(LocalDate date, String boat, int passengers, BigDecimal takings) {
}

// Reads a till file: a header line, then a sailing per line. A line that cannot be read throws
// an IllegalArgumentException that names its number. Use it as it is.
class Sailings {
    static List<Sailing> read(Path file) throws IOException {
        List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        List<Sailing> sailings = new ArrayList<>();
        for (int i = 1; i < lines.size(); i++) {
            String[] parts = lines.get(i).split(",", -1);
            try {
                if (parts.length != 4) {
                    throw new IllegalArgumentException("it has " + parts.length + " parts");
                }
                sailings.add(new Sailing(LocalDate.parse(parts[0].strip()), parts[1].strip(), Integer.parseInt(parts[2].strip()), new BigDecimal(parts[3].strip())));
            } catch (RuntimeException e) {
                throw new IllegalArgumentException("Line " + (i + 1) + " cannot be read", e);
            }
        }
        return sailings;
    }
}

// Task 1: Make a job that reads one till file
// Write a class Jobs with one method. static Callable<BigDecimal> takings(Path file) gives back
// a job that, when it is called, reads file with Sailings.read and gives back the takings of
// all its sailings added up, 0 for none. Making the job reads nothing. Calling it lets anything
// reading throws reach whoever called it.

// Task 2: Gather the answers, and the problems
// Write a class Results with one method, which throws InterruptedException. static BigDecimal
// collect(Map<String, Future<BigDecimal>> answers, List<String> problems) waits for every
// future and gives back the takings of those that worked, added up, reading the answers one
// after another on the thread that called it. A future whose job threw is left out of the total,
// and a problem is added for it: its name in the map, a colon and a space, then the message of
// what its job threw, as in "relief-boat.csv: Line 3 cannot be read". The other futures still
// count. The problems may come in any order.

// Task 3: Check the whole day with a pool of three
// Write a class Closing with one method, which throws InterruptedException. static BigDecimal
// day(List<Path> files, List<String> problems) makes a pool of exactly three threads, hands it
// the job of Jobs.takings for every file, keeps each future under the file's own name (the last
// part of its path, as in linnet.csv), and gives back what Results.collect makes of them, with
// problems. Whatever happens, the pool is shut down before day returns.
