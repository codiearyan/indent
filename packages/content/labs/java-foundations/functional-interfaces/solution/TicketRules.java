// The hut's ticket rules. Run this file in the terminal with: java TicketRules.java
//
// 1. Hand a rule and a fare to the desk
// 2. Join two rules, and add the fee to a fare
// 3. Write four functions as method references

import java.util.*;
import java.util.function.*;

public class TicketRules {
    public static void main(String[] args) {
        // main is yours: try your types here, and take the // off a group of lines once what
        // it uses is written.
        List<Ticket> tickets = List.of(
            new Ticket("Ishbel", 34, "Gannet"),
            new Ticket("Torquil", 9, "Linnet"),
            new Ticket("Peigi", 12, "Gannet"),
            new Ticket("Murdo", 67, "Gannet"));
        Predicate<Ticket> child = t -> t.age() < 16;
        Function<Ticket, Integer> fare = t -> t.age() < 16 ? 2 : 4;

        System.out.println(Desk.keep(tickets, child));
        System.out.println(Desk.prices(tickets, fare));

        Predicate<Ticket> onGannet = t -> t.boat().equals("Gannet");
        System.out.println(Desk.keep(tickets, RuleBook.both(child, onGannet)));
        System.out.println(Desk.prices(tickets, RuleBook.withFee(fare, 1)));

        System.out.println(Shortcuts.readNumber().apply("42") + 1);
        System.out.println(Shortcuts.onList(List.of("Peigi", "Murdo")).test("Peigi"));
        System.out.println(Shortcuts.passengerOf().apply(tickets.get(0)));
        List<Ticket> later = Shortcuts.newList().get();
        later.add(tickets.get(1));
        System.out.println(later);
    }
}

// One ticket: the passenger, their age and the boat. Use it as it is.
record Ticket(String passenger, int age, String boat) {
}

// Task 1: Hand a rule and a fare to the desk
// Write a class Desk with two methods. static List<Ticket> keep(List<Ticket> tickets,
// Predicate<Ticket> rule) gives back a new list of the tickets the rule says yes to, in the
// order they came. static List<Integer> prices(List<Ticket> tickets, Function<Ticket, Integer>
// fare) gives back the fare of each ticket, in the order they came. tickets stays as it is.
class Desk {
    static List<Ticket> keep(List<Ticket> tickets, Predicate<Ticket> rule) {
        List<Ticket> kept = new ArrayList<>();
        for (Ticket t : tickets) {
            if (rule.test(t)) {
                kept.add(t);
            }
        }
        return kept;
    }

    static List<Integer> prices(List<Ticket> tickets, Function<Ticket, Integer> fare) {
        List<Integer> prices = new ArrayList<>();
        for (Ticket t : tickets) {
            prices.add(fare.apply(t));
        }
        return prices;
    }
}

// Task 2: Join two rules, and add the fee to a fare
// Write a class RuleBook with two methods. static Predicate<Ticket> both(Predicate<Ticket>
// first, Predicate<Ticket> second) gives back a rule that says yes only when both say yes, and
// that does not ask second about a ticket first has said no to. static Function<Ticket, Integer>
// withFee(Function<Ticket, Integer> fare, int fee) gives back a function: the fare of a ticket,
// plus fee.
class RuleBook {
    static Predicate<Ticket> both(Predicate<Ticket> first, Predicate<Ticket> second) {
        return first.and(second);
    }

    static Function<Ticket, Integer> withFee(Function<Ticket, Integer> fare, int fee) {
        return fare.andThen(price -> price + fee);
    }
}

// Task 3: Write four functions as method references
// Write a class Shortcuts with four methods, each giving back a method reference:
// static Function<String, Integer> readNumber() reads a whole number written as text.
// static Predicate<String> onList(List<String> names) says whether a name is in names, asking
// names itself each time.
// static Function<Ticket, String> passengerOf() gives the passenger of a ticket.
// static Supplier<List<Ticket>> newList() gives a new, empty ArrayList each time it is asked.
class Shortcuts {
    static Function<String, Integer> readNumber() {
        return Integer::parseInt;
    }

    static Predicate<String> onList(List<String> names) {
        return names::contains;
    }

    static Function<Ticket, String> passengerOf() {
        return Ticket::passenger;
    }

    static Supplier<List<Ticket>> newList() {
        return ArrayList::new;
    }
}
