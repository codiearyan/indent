// Closing up the hut. Run this file in the terminal with: java ClosingUp.java
//
// 1. Lower the shutter whatever happens
// 2. Switch the printer off whatever happens
// 3. Close the printer, then the till
//
// When something goes wrong, its exception must still reach the caller: cleaning up never
// hides it.

public class ClosingUp {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        // Shutter shutter = new Shutter();
        // TicketPrinter printer = new TicketPrinter("the hut");
        // System.out.println(Hut.sell(shutter, printer, new String[] { "Adult", "Child" }) + " sold");
        // printer.close();

        // System.out.println(Day.printAll(new String[] { "Adult", "Adult", "Bike" }) + " printed");

        // System.out.println(Sale.sellAll(new String[] { "Adult", "Child" }, new int[] { 320, 160 }) + "p taken");
    }
}

// The hut's window shutter. Use it as it is.
class Shutter {
    void raise() {
        System.out.println("Shutter up");
    }

    void lower() {
        System.out.println("Shutter down");
    }
}

// The ticket printer. Switch it off with close() after use. Use it as it is.
class TicketPrinter implements AutoCloseable {
    private int paper = 4;

    TicketPrinter(String where) {
        System.out.println("Printer on at " + where);
    }

    void print(String ticket) {
        if (ticket.isEmpty()) {
            throw new IllegalArgumentException("Nothing to print on a ticket");
        }
        if (paper == 0) {
            throw new IllegalStateException("Out of paper");
        }
        paper--;
        System.out.println("Ticket: " + ticket);
    }

    @Override
    public void close() {
        System.out.println("Printer off");
    }
}

// The till. Shut it with close() after use. Use it as it is.
class Till implements AutoCloseable {
    Till() {
        System.out.println("Till open");
    }

    void add(int pence) {
        if (pence < 0) {
            throw new IllegalArgumentException("A fare cannot be below 0: " + pence);
        }
        System.out.println("Till: " + pence + "p");
    }

    @Override
    public void close() {
        System.out.println("Till shut");
    }
}

// Task 1: Lower the shutter whatever happens
// Write a class Hut with a method static int sell(Shutter shutter, TicketPrinter printer,
// String[] tickets). It raises the shutter, prints each ticket on the printer and gives back
// how many it printed. The shutter is lowered again, once, whatever happens: when the printer
// fails, its exception reaches the caller with the shutter down. sell does not switch the
// printer off: whoever handed it over does that.

// Task 2: Switch the printer off whatever happens
// Write a class Day with a method static int printAll(String[] tickets). It makes its own
// TicketPrinter, prints each ticket and gives back how many it printed. The printer is
// switched off, once, whatever happens: when it fails, its exception reaches the caller with
// the printer off.

// Task 3: Close the printer, then the till
// Write a class Sale with a method static int sellAll(String[] tickets, int[] fares). It opens a
// Till, then a TicketPrinter. For each ticket it adds the fare at the same position
// to the till, then prints the ticket, and it gives back the pence it added. Whatever happens,
// the printer is switched off and then the till is shut, each once, and an exception reaches
// the caller.
