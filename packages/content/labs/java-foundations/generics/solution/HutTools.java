// Tools every program at the hut can share. Run this file in the terminal with:
// java HutTools.java
//
// 1. Write a pair that holds two things of any types
// 2. Turn any rota on by a week
// 3. Find the largest of anything that has an order

import java.util.*;

public class HutTools {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        Pair<String, Integer> sailing = new Pair<>("Gannet", 9);
        System.out.println(sailing.first() + " at " + sailing.second());
        Pair<Integer, String> back = sailing.swapped();
        System.out.println(back.first() + " for the " + back.second());

        List<String> skippers = List.of("Murdo", "Innes", "Tormod");
        System.out.println("Next week: " + Rotas.nextWeek(skippers));
        List<Integer> boats = List.of(4, 9, 2);
        System.out.println("Boats next week: " + Rotas.nextWeek(boats));

        System.out.println("Busiest crossing: " + Most.largest(List.of(14, 9, 31, 22)));
        System.out.println("Last in the book: " + Most.largest(skippers));
    }
}

// Task 1: Write a pair that holds two things of any types
// Write a class Pair<A, B> with a constructor Pair(A first, B second), and three methods:
// A first() and B second() give back what it holds, and Pair<B, A> swapped() gives back a new
// pair with the two the other way round. The pair it is called on stays as it is.
class Pair<A, B> {
    private final A first;
    private final B second;

    Pair(A first, B second) {
        this.first = first;
        this.second = second;
    }

    A first() {
        return first;
    }

    B second() {
        return second;
    }

    Pair<B, A> swapped() {
        return new Pair<>(second, first);
    }
}

// Task 2: Turn any rota on by a week
// Write a class Rotas with a generic method static <T> List<T> nextWeek(List<T> rota). It
// gives back a new list: the rota with its first item moved to the end. An empty rota gives
// back an empty list. rota stays as it is.
class Rotas {
    static <T> List<T> nextWeek(List<T> rota) {
        List<T> next = new ArrayList<>(rota);
        if (!next.isEmpty()) {
            next.add(next.remove(0));
        }
        return next;
    }
}

// Task 3: Find the largest of anything that has an order
// Write a class Most with a generic method largest that takes a List<T> items, where T is any
// type with a natural order, and gives back the largest item, by that order. An empty list
// gives back null. items stays as it is.
class Most {
    static <T extends Comparable<T>> T largest(List<T> items) {
        T best = null;
        for (T item : items) {
            if (best == null || item.compareTo(best) > 0) {
                best = item;
            }
        }
        return best;
    }
}
