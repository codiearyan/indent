// A ticket, which the hut makes from another package.

// Task 2: Make the ticket usable from the hut
// Ticket belongs to the package lanternquay.tickets too. Write its package line and a public
// class Ticket with two private fields, a String passenger and an int pence. Give it a public
// constructor Ticket(String passenger, int age), which gets the fare from Fares.fareFor, and a
// public method String line() that gives back the passenger and the fare in the form
// Morag: 320p.
package lanternquay.tickets;

public class Ticket {
    private String passenger;
    private int pence;

    public Ticket(String passenger, int age) {
        this.passenger = passenger;
        this.pence = Fares.fareFor(age);
    }

    public String line() {
        return passenger + ": " + pence + "p";
    }
}
