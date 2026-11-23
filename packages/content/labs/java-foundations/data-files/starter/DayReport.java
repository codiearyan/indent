// The day's sailings, read from sailings.csv, and the report for the harbour office. Run this
// file in the terminal with: java DayReport.java
//
// 1. Read one line into a record
// 2. Read the file, keep the good lines
// 3. Add up the takings and write the report

import java.io.*;
import java.math.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;

public class DayReport {
    public static void main(String[] args) throws IOException {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        Path sailings = Path.of("sailings.csv");
        System.out.println(Files.readString(sailings, StandardCharsets.UTF_8));

        // System.out.println(Lines.parse("2031-06-14,Linnet,23,77.05", 2));

        // List<String> problems = new ArrayList<>();
        // List<Sailing> day = Day.read(sailings, problems);
        // System.out.println(day.size() + " sailings, problems: " + problems);

        // System.out.println("Takings: " + Report.takings(day));
        // Report.write(Path.of("report.txt"), day, problems);
        // System.out.print(Files.readString(Path.of("report.txt"), StandardCharsets.UTF_8));
    }
}

// One sailing, as a line of sailings.csv holds it. Use it as it is.
record Sailing(LocalDate date, String boat, int passengers, BigDecimal takings) {
}

// Task 1: Read one line into a record
// Write a class Lines with one method. static Sailing parse(String line, int number) gives back
// the Sailing a line such as 2031-06-14,Linnet,23,77.05 holds: the date, the boat, the number of
// passengers and the takings, split at the commas, each with any space at either end left off.
// A line that cannot be read, because it has not exactly four parts or a part is not what it
// should be, throws an IllegalArgumentException whose message names number, the line's number.

// Task 2: Read the file, keep the good lines
// Write a class Day with one method, which throws IOException. static List<Sailing> read(Path
// file, List<String> problems) reads file, in UTF-8, and gives back a Sailing for each line
// after the first, which is the header, read with Lines.parse. A line is numbered as the file
// numbers it, the header being line 1. A line parse refuses is left out, its exception's
// message is added to problems, and the lines after it are still read.

// Task 3: Add up the takings and write the report
// Write a class Report with two methods. static BigDecimal takings(List<Sailing> sailings)
// gives back the takings of all the sailings added up, and 0 for none. static void write(Path
// file, List<Sailing> sailings, List<String> problems), which throws IOException, makes file
// hold the report and nothing else, in UTF-8, each line followed by "\n": a line for each
// sailing, its date, boat, passengers and takings, as in 2031-06-14 Linnet 23 £77.05, then
// Total and the takings added up, as in Total £107.20, then each problem after Problem: and a
// space. Every amount has a pound sign and two decimal places, and a point.
