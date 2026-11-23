// The hut's files: the notices, the old till's export and the day's log. Run this file in the
// terminal with: java HutFiles.java
//
// 1. Read a file
// 2. Write a file, and add to one
// 3. Count through a long file

import java.io.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.*;

public class HutFiles {
    public static void main(String[] args) throws IOException {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written. The paths are relative, so they name files in this folder.
        Path notices = Path.of("notices.txt");
        Path till = Path.of("till.txt");
        Path log = Path.of("log.txt");
        System.out.println("notices.txt is there: " + Files.exists(notices));

        System.out.println(Reading.lines(notices));
        System.out.println(Reading.tillLines(till));

        Writing.append(log, "Closed up at 18:30");
        Writing.save(Path.of("board.txt"), List.of("Linnet 09:05", "Gannet 14:30"));

        System.out.println(Counting.linesWith(till, "Linnet") + " lines name the Linnet");
    }
}

// Task 1: Read a file
// Write a class Reading with two methods, each throws IOException. static List<String>
// lines(Path file) gives back the lines of file, a file in UTF-8, without their line ends.
// static List<String> tillLines(Path file) does the same for a file the old till wrote, in
// ISO-8859-1. When the file is not there, the exception reaches the caller.
class Reading {
    static List<String> lines(Path file) throws IOException {
        return Files.readAllLines(file, StandardCharsets.UTF_8);
    }

    static List<String> tillLines(Path file) throws IOException {
        return Files.readAllLines(file, StandardCharsets.ISO_8859_1);
    }
}

// Task 2: Write a file, and add to one
// Write a class Writing with two methods, each throws IOException. static void save(Path file,
// List<String> lines) makes file hold lines and nothing else, each followed by "\n", in UTF-8.
// static void append(Path file, String line) adds line and "\n" to the end of file and keeps
// what was there. Both make the file when it is not there yet.
class Writing {
    static void save(Path file, List<String> lines) throws IOException {
        StringBuilder text = new StringBuilder();
        for (String line : lines) {
            text.append(line).append("\n");
        }
        Files.writeString(file, text, StandardCharsets.UTF_8);
    }

    static void append(Path file, String line) throws IOException {
        Files.writeString(file, line + "\n", StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
    }
}

// Task 3: Count through a long file
// Write a class Counting with one method, which throws IOException. static long linesWith(Path
// file, String word) gives back how many lines of file, a file in ISO-8859-1, hold word. The
// file can be long, so read it a line at a time, and close it when you are done. When the
// file is not there, it gives back 0.
class Counting {
    static long linesWith(Path file, String word) throws IOException {
        if (!Files.exists(file)) {
            return 0;
        }
        try (Stream<String> lines = Files.lines(file, StandardCharsets.ISO_8859_1)) {
            return lines.filter(line -> line.contains(word)).count();
        }
    }
}
