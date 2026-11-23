// The departure board at the slip, and the references on the new tickets. Run this file in the
// terminal with: java SlipBoard.java
//
// 1. Line up a row of the board
// 2. Build the whole board
// 3. Read a ticket reference

import java.util.*;

public class SlipBoard {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        String chalk = "Linnet 9:5 12";
        System.out.println("The chalk board says: " + chalk);

        System.out.println("[" + Board.row("Linnet", 9, 5, 12) + "]");
        System.out.println("[" + Board.row("Gannet", 14, 30, 3) + "]");

        List<String> rows = List.of("Linnet     09:05  12", "Gannet     14:30   3");
        System.out.print(Sheet.board("Departures", rows));

        System.out.println(Refs.parts(" LQ.2031.0457 "));
        System.out.println(Refs.sameRef("lq.2031.0457", " LQ.2031.0457"));
        System.out.println(Refs.digits("LQ.2031.0457"));
    }
}

// Task 1: Line up a row of the board
// Write a class Board with one method. static String row(String boat, int hour, int minute,
// int seats) gives back one row of the board: the boat's name on the left of a column 10
// characters wide, a space, the time as two digits, a colon and two digits, a space, then the
// seats on the right of a column 3 characters wide. Check's names are at most 10 characters.
class Board {
    static String row(String boat, int hour, int minute, int seats) {
        return String.format("%-10s %02d:%02d %3d", boat, hour, minute, seats);
    }
}

// Task 2: Build the whole board
// Write a class Sheet with two methods. static void addRows(StringBuilder board, List<String>
// rows) adds to the end of board each row followed by "\n", then a line of - as long as the
// longest row, followed by "\n". For no rows it adds nothing. static String board(String title,
// List<String> rows) gives back the whole board as text: the title and "\n", then the rows and
// the line as addRows adds them. A StringBuilder of its own, handed to addRows, makes it short.
class Sheet {
    static void addRows(StringBuilder board, List<String> rows) {
        if (rows.isEmpty()) {
            return;
        }
        int longest = 0;
        for (String row : rows) {
            board.append(row).append("\n");
            longest = Math.max(longest, row.length());
        }
        board.append("-".repeat(longest)).append("\n");
    }

    static String board(String title, List<String> rows) {
        StringBuilder board = new StringBuilder();
        board.append(title).append("\n");
        addRows(board, rows);
        return board.toString();
    }
}

// Task 3: Read a ticket reference
// Write a class Refs with three methods. static List<String> parts(String ref) gives back the
// parts of a reference such as LQ.2031.0457, split at each point, with any space at either end
// of ref left off first. static boolean sameRef(String a, String b) says whether two references
// are the same, whatever capital letters they use and whatever space is at either end.
// static long digits(String ref) gives back how many digits ref holds.
class Refs {
    static List<String> parts(String ref) {
        return List.of(ref.strip().split("\\."));
    }

    static boolean sameRef(String a, String b) {
        return a.strip().equalsIgnoreCase(b.strip());
    }

    static long digits(String ref) {
        return ref.chars().filter(Character::isDigit).count();
    }
}
