// The ticket hut's program, which prints the morning's tickets.

// Task 3: Print the morning's tickets at the hut
// Hut belongs to the package lanternquay.hut. Write its package line, import Ticket from the
// package lanternquay.tickets, and write a class Hut with a main. For each person in the queue
// below, main makes a Ticket and prints what its line() gives back, one ticket per line, in
// queue order.
//
// The queue this morning, to copy into main:
//     String[] names = {"Morag", "Lachie", "Ishbel"};
//     int[] ages = {34, 9, 3};
package lanternquay.hut;

import lanternquay.tickets.Ticket;

public class Hut {
    public static void main(String[] args) {
        String[] names = {"Morag", "Lachie", "Ishbel"};
        int[] ages = {34, 9, 3};
        for (int i = 0; i < names.length; i++) {
            Ticket ticket = new Ticket(names[i], ages[i]);
            System.out.println(ticket.line());
        }
    }
}
