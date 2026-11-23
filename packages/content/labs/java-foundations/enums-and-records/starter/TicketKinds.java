// Kinds of ticket, routes and tickets that never change. Run this file in the terminal with:
// java TicketKinds.java
//
// 1. Write the kinds of ticket, and a price for each
// 2. Write the routes, each with its minutes
// 3. Write a ticket that never changes

public class TicketKinds {
    public static void main(String[] args) {
        // main is yours: try your types here, and take the // off a line once what it uses is
        // written.
        // System.out.println("A child pays " + Prices.pence(Kind.CHILD));

        // System.out.println("The island crossing takes " + Route.ISLAND.minutes() + " minutes");
        // System.out.println(Route.ISLAND.crossingsIn(8) + " island crossings in 8 hours");

        // Ticket morning = new Ticket("Calum", Kind.BIKE, 100);
        // System.out.println(morning);
        // System.out.println(morning.forPassenger("Fenella"));
    }
}

// Task 1: Write the kinds of ticket, and a price for each
// Write an enum Kind with three values, ADULT, CHILD and BIKE. Then write a class Prices with a
// method static int pence(Kind kind) that uses a switch over the kind: an adult pays 320, a
// child 160 and a bike 100.

// Task 2: Write the routes, each with its minutes
// Write an enum Route with three values, each carrying how long its crossing takes: HARBOUR
// 10 minutes, ISLAND 35 and HEADLAND 20. Each keeps its minutes in a private final int field,
// set by the enum's constructor. Write int minutes(), and int crossingsIn(int hours): how many
// whole crossings of that route fit in that many hours.

// Task 3: Write a ticket that never changes
// Write a record Ticket with a String passenger, a Kind kind and an int pence, in that order,
// and a method Ticket forPassenger(String other): a new ticket for other, of the same kind and
// at the same price.
