// Ossian's evening report. Run this file in the terminal with: java EveningReport.java
//
// 1. Mend the last departure
// 2. Mend the skippers' notice
// 3. Mend the seats sold
//
// Each task is a small program that stops with a stack trace. Read the trace, find the one
// method that is wrong, and mend it. Leave the other methods as they are: they are right.

public class EveningReport {
    public static void main(String[] args) {
        // main is yours. Each line runs one task's program, and the first one that stops ends
        // the run: put // in front of a line to see the ones after it.
        System.out.println(Departures.last(new int[] { 9, 11, 13, 15, 17, 19 }));
        System.out.print(Skippers.notice(new String[] { "Linnet", "Gannet" }, new String[] { "Linnet", "Gannet" }, new String[] { "Ossian", "Murdo" }));
        System.out.println(Takings.total(new String[] { "09:00,Linnet,9", "11:00,Gannet,14", "13:00,Linnet,6" }));
    }
}

// Reads a count of seats written in the ledger. Use it as it is: it is right.
class Ledger {
    static int seats(String count) {
        try {
            return Integer.parseInt(count);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Not a count of seats: " + count, e);
        }
    }
}

// Task 1: Mend the last departure
// Departures.last should give back the day's last crossing, as in Crossing 6 leaves at 19:00.
// It stops with a stack trace. Mend the one method that is wrong, and leave the others as
// they are.
class Departures {
    // The last crossing of the day.
    static String last(int[] hours) {
        return line(hours, hours.length - 1);
    }

    // The crossing at a position, counting from 0, as people read it.
    static String line(int[] hours, int position) {
        return "Crossing " + (position + 1) + " leaves at " + clock(hours, position);
    }

    // The hour of the crossing at a position, counting from 0, as in 19:00.
    static String clock(int[] hours, int position) {
        return hours[position] + ":00";
    }
}

// Task 2: Mend the skippers' notice
// Skippers.notice should give back a line for each boat sailing today, as in Gannet: M. with
// the first letter of its skipper's name. Every boat sailing today is on the rota. It stops
// with a stack trace. Mend the one method that is wrong, and leave the others as they are.
class Skippers {
    // A line for each boat sailing today, with its skipper from the rota.
    static String notice(String[] sailing, String[] rotaBoats, String[] rotaSkippers) {
        String text = "";
        for (String boat : sailing) {
            String skipper = skipperOf(boat, rotaBoats, rotaSkippers);
            text += line(boat, skipper);
        }
        return text;
    }

    // One line of the notice, as in Gannet: M.
    static String line(String boat, String skipper) {
        return boat + ": " + initial(skipper) + ".\n";
    }

    // The first letter of a name.
    static String initial(String name) {
        return name.substring(0, 1);
    }

    // The skipper of a boat on the rota. The two lists of the rota are in the same order: the
    // skipper at a position sails the boat at the same position.
    static String skipperOf(String boat, String[] rotaBoats, String[] rotaSkippers) {
        for (int i = 0; i < rotaBoats.length; i++) {
            if (rotaBoats[i].equals(boat)) {
                return rotaSkippers[i];
            }
        }
        return null;
    }
}

// Task 3: Mend the seats sold
// Takings.total should give back the seats sold over the day, from ledger lines such as
// 09:00,Linnet,9: the time, the boat and the seats. It stops with a stack trace. Mend the one
// method that is wrong, and leave the others as they are. Ledger, above the tasks, is right.
class Takings {
    // The seats sold over the day.
    static int total(String[] lines) {
        int sum = 0;
        for (String line : lines) {
            sum += seatsOn(line);
        }
        return sum;
    }

    // The seats sold on one ledger line.
    static int seatsOn(String line) {
        String[] parts = line.split(",");
        return Ledger.seats(parts[2]);
    }
}
