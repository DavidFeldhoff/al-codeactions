# Change Log

All notable changes to the "al-codeactions" extension will be documented in this file.

## 0.1.8

- Create procedures out of event subscribers. This was previously not possible.
- Add the Option values to the parameter declaration. There was an issue if it was an option field of a record (variables or parameters were fine).

## 0.1.7

- technical updates

## 0.1.6

- Insert the procedure always at the end of the file except the procedure should be created out of
  another procedure / trigger. Then it should be inserted directly after the calling procedure.

## 0.1.4

- Allow procedures as parameters
- Support primitive types as parameters (integer, decimal, text, boolean)
- Number the parameters if they have the same name (e.g. Customer."No." and Vendor."No.")
- Identify table fields correctly
- Place creatable procedures of tables behind the keys-section
- Fix other minor issues

## 0.1.3

- Allow a semicolon at the end of a procedure declaration line (e.g. `trigger OnOpenPage();`)
- Create procedures locally, if possible

## 0.1.2

- Do not create a procedure for an enum-object
- Fix problem with calling procedures that contain parameters with closing brackets (for example an Option-String)

## 0.1.0

- Preview release
