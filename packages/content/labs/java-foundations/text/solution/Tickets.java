// The tickets Bridie prints. Run it in the terminal with: java Tickets.java
//
// 1. Print the party size
// 2. Make the short code
// 3. Check the boat on the ticket
// 4. Fit the ticket on the printer

public class Tickets {
    public static void main(String[] args) {
        // Today's ticket from the clipboard. Check tries other values on these lines, so build on
        // the names, not on the values themselves.
        int adults = 2;
        int children = 3;
        String destination = "Corran";
        String todayBoat = "Linnet";
        String ticket = "Linnet 07:30 Corran";
        // The boat named on the ticket: its first word, cut out by the printer's software.
        String ticketBoat = ticket.substring(0, ticket.indexOf(' '));

        System.out.println("Ticket: " + ticket);

        // Task 1: Print the party size
        // Print one line that says how many people travel on this ticket, adults and children
        // together, like this: Passengers: 5
        System.out.println("Passengers: " + (adults + children));

        // Task 2: Make the short code
        // Make a String called code: the first three letters of destination, in capital letters.
        // For Corran that is COR.
        String code = destination.substring(0, 3).toUpperCase();

        // Task 3: Check the boat on the ticket
        // Make a boolean called rightBoat: true when ticketBoat is the same text as todayBoat,
        // false when it is not.
        boolean rightBoat = ticketBoat.equals(todayBoat);

        // Task 4: Fit the ticket on the printer
        // The printer fits 24 characters on a line. Make an int called spaceLeft: how many
        // characters are left on the line after ticket.
        int spaceLeft = 24 - ticket.length();
    }
}
