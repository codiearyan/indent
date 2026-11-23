# A data file into your own types

## What you will be able to do

The last three issues gave you the pieces: reading a file, writing one, and taking a line apart. This issue puts them together into the job most programs that touch files really do: read a file of records into your own types, refuse what is wrong without losing the rest, work something out, and write the answer back. By the end of this issue you will be able to:

- read a comma-separated file into a `std::vector` of your own struct
- refuse one bad line, with its line number, and keep every good one
- write a report from what you read
- write it all so it can be tried without a file

## The request from Ambrose

> **Ambrose:** Dorrit's form saves the day's tickets in a file now. At closing time I want three numbers from it: how many repairs, how many minutes, how much in parts. And when a line is wrong, tell me which line, so I can look at the slip. Don't just skip it, and don't give up on the rest of the day.

Today's file is `data/tickets.csv`. The code goes in `src/day.cpp`, with `Repair` and last issue's tools given at the top.

## A file of records

A comma-separated file, `.csv`, is the plainest way to keep a table: one record per line, its fields with commas between them, and usually a first line that names the fields. A tea shop's deliveries might look like this:

```
tin,blend,grams,price
41,earl grey,250,6.80
42,assam,five hundred,9.10
43,lapsang,100,4.25
```

The heading is not a record, so it is skipped. Every other line becomes one value of your own type, here a `struct Delivery` with four members.

## One line into one value

Reading a line into a struct is part 7's pattern: a function that says whether it worked, and fills in a value through a reference when it did.

```cpp
bool parseDelivery(const std::string& line, Delivery& delivery);
```

Inside, split the line, trim each field, and turn each number field into a number with a check, as last issue did. Look at all of them before you touch `delivery`. If you fill in the tin and then find that the grams are "five hundred", the caller's value is half new and half old, and the caller was told `false`. Keep each field in a variable of its own, and fill in the struct only once they are all good.

A line can be wrong in many ways: a field missing, one too many, a word where a number should be, an empty field. Count the fields before you use them.

## One bad line, not a bad day

When line 3 is wrong, there are three things a program can do. It can stop, and lose every line after it. It can skip the line in silence, and the totals are wrong with nobody knowing why. Or it can refuse the line out loud, keep the rest, and say which line it was. Only the last one lets someone fix the slip.

Say it the way a person would find it: the heading is line 1, and the first record is line 2. Count every line you read, blank ones included, so the number matches what an editor shows. A blank line is no record and no mistake either: skip it. In a file from Windows a blank line still holds a carriage return, so trim before asking whether it is empty.

## Totals and the report

Minutes add up in an `int`. Money does not: 6.80 and 4.25 have pence, and an `int` loses them, so add them in a `double` and write them with 2 decimals. The report can only be written once the whole file is read: until the last line, nobody knows which lines will be refused.

## Streams in, so it can be tried

Write the reading with a `std::istream&` and the report with a `std::ostream&`. Then `main` hands them files, and anyone trying the code hands them a string stream:

```cpp
std::istringstream deliveries("tin,blend,grams,price\n41,earl grey,250,6.80\n");
std::vector<int> refused;
auto all = readDeliveries(deliveries, refused);
```

No file to make, nothing left on disk, and each case is one line. That is how Check tries your code.

Only the last step, which joins the files to the functions, takes paths. Open the file you read first, and the one you write only once the first has opened: opening a file for writing makes it, and a report that appears when there was nothing to read is a report that lies.

## Your work in this issue

Write the four tasks in `src/day.cpp`, and try them in `main` on `data/tickets.csv`. Build and run from the workspace folder with `g++ -std=c++17 -Wall src/day.cpp -o day && ./day`, then look at `report.txt`. Check hands your functions lines, streams and files of its own.
