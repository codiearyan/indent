# Splitting and joining. Run this file with: python3 callout_book.py
#
# Task 1: How many words
# Task 2: The book, line by line
# Task 3: One callout in its parts
# Task 4: The hours added up
# Task 5: Put the right hill back

# The callout book as Rhona typed it up, one callout a line: the date, the hill, the hours and
# the crew, with a semicolon between them. Check calls your functions with values of its own.
book = """14 Nov; Carn Dubh; 3 hours; 8 crew
22 Nov;Garve Edge ; 5 hours;6 crew
02 Dec; Carn Dhub; 12 hours; 10 crew
"""
message = "BRAVO TWO  at the bridge,  two walkers  with us "

print(book)

# Task 1: How many words
# Write a function called word_count that takes a radio message and gives back how many words
# it has. Spaces, however many, only separate the words. Print what it gives back for message.

# Task 2: The book, line by line
# Write a function called book_lines that takes the whole book as one text and gives back a
# list of its lines, without their line ends. Print what it gives back for book.

# Task 3: One callout in its parts
# Write a function called callout_parts that takes one line of the book and gives back a list
# of its parts, the text between the semicolons, each without the spaces at its start and
# end. Print what it gives back for the first line of the book.

# Task 4: The hours added up
# Write a function called total_hours that takes a list of lines of the book and gives back
# the hours of all of them added up, as a whole number. Print what it gives back for the
# lines of book.

# Task 5: Put the right hill back
# Write a function called with_hill that takes one line of the book and the name of a hill, and
# gives back the line with that hill in place of the one it had, its parts joined with a
# semicolon and a space. Print what it gives back for the third line of the book and
# "Carn Dubh".
