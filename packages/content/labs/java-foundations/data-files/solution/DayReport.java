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

        System.out.println(Lines.parse("2031-06-14,Linnet,23,77.05", 2));

        List<String> problems = new ArrayList<>();
        List<Sailing> day = Day.read(sailings, problems);
        System.out.println(day.size() + " sailings, problems: " + problems);

        System.out.println("Takings: " + Report.takings(day));
        Report.write(Path.of("report.txt"), day, problems);
        System.out.print(Files.readString(Path.of("report.txt"), StandardCharsets.UTF_8));
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
class Lines {
    static Sailing parse(String line, int number) {
        String[] parts = line.split(",", -1);
        if (parts.length != 4) {
            throw new IllegalArgumentException("Line " + number + " has " + parts.length + " parts, not 4: " + line);
        }
        try {
            LocalDate date = LocalDate.parse(parts[0].strip());
            String boat = parts[1].strip();
            int passengers = Integer.parseInt(parts[2].strip());
            BigDecimal takings = new BigDecimal(parts[3].strip());
            return new Sailing(date, boat, passengers, takings);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Line " + number + " cannot be read: " + line, e);
        }
    }
}

// Task 2: Read the file, keep the good lines
// Write a class Day with one method, which throws IOException. static List<Sailing> read(Path
// file, List<String> problems) reads file, in UTF-8, and gives back a Sailing for each line
// after the first, which is the header, read with Lines.parse. A line is numbered as the file
// numbers it, the header being line 1. A line parse refuses is left out, its exception's
// message is added to problems, and the lines after it are still read.
class Day {
    static List<Sailing> read(Path file, List<String> problems) throws IOException {
        List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        List<Sailing> sailings = new ArrayList<>();
        for (int i = 1; i < lines.size(); i++) {
            try {
                sailings.add(Lines.parse(lines.get(i), i + 1));
            } catch (IllegalArgumentException e) {
                problems.add(e.getMessage());
            }
        }
        return sailings;
    }
}

// Task 3: Add up the takings and write the report
// Write a class Report with two methods. static BigDecimal takings(List<Sailing> sailings)
// gives back the takings of all the sailings added up, and 0 for none. static void write(Path
// file, List<Sailing> sailings, List<String> problems), which throws IOException, makes file
// hold the report and nothing else, in UTF-8, each line followed by "\n": a line for each
// sailing, its date, boat, passengers and takings, as in 2031-06-14 Linnet 23 £77.05, then
// Total and the takings added up, as in Total £107.20, then each problem after Problem: and a
// space. Every amount has a pound sign and two decimal places, and a point.
class Report {
    static BigDecimal takings(List<Sailing> sailings) {
        BigDecimal total = BigDecimal.ZERO;
        for (Sailing s : sailings) {
            total = total.add(s.takings());
        }
        return total;
    }

    static void write(Path file, List<Sailing> sailings, List<String> problems) throws IOException {
        StringBuilder report = new StringBuilder();
        for (Sailing s : sailings) {
            report.append(s.date()).append(' ').append(s.boat()).append(' ').append(s.passengers())
                .append(' ').append(pounds(s.takings())).append("\n");
        }
        report.append("Total ").append(pounds(takings(sailings))).append("\n");
        for (String problem : problems) {
            report.append("Problem: ").append(problem).append("\n");
        }
        Files.writeString(file, report, StandardCharsets.UTF_8);
    }

    static String pounds(BigDecimal amount) {
        return "£" + amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
