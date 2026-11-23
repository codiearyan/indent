// The ticket roll at the hut. Run this file in the terminal with: java TicketRoll.java
//
// 1. Number every ticket
// 2. Keep the adult fare in one place
// 3. Give each ticket its line

public class TicketRoll {
    public static void main(String[] args) {
        // main is yours: try your tickets here, and take the // off a line once what it uses
        // is written.
        // Ticket first = new Ticket("Morag", 34);
        // Ticket second = new Ticket("Lachie", 9);
        // System.out.println(first.number + " and " + second.number + ", " + Ticket.issued + " issued");
        // System.out.println("A child pays " + Ticket.fareFor(9));
        // System.out.println(second.line());
    }
}

class Ticket {
    // Task 1: Number every ticket
    // Each ticket has a String passenger, an int age and an int number of its own. The class
    // keeps one count of the tickets issued so far, a static int issued, shared by every
    // ticket. Write the four fields and a constructor Ticket(String passenger, int age) that
    // counts the ticket and gives it the next number: the first ticket is number 1.

    // Task 2: Keep the adult fare in one place
    // Write a constant, a static final int ADULT_PENCE of 320, and a method
    // static int fareFor(int age): under 16 pays half of ADULT_PENCE, everyone else all of it.

    // Task 3: Give each ticket its line
    // Write String line(), which gives back the ticket's number, passenger and fare in the
    // form Ticket 4: Lachie, 160p. It builds on Tasks 1 and 2.
}
