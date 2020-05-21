# Change Log

All notable changes to the "al-codeactions" extension will be documented in this file.

## 0.2.6

- edited Readme.

## 0.2.5

- Create Procedure Code Action
  - HandlerFunctions: Now it's possible to create missing HandlerFunctions.
  - Cursor Positioning: Now the cursor jumps directly to the position of the created procedure.
  - Parameter Naming: Spaces and other special characters are removed so that there's no quotation necessary.
- some performance improvements.
- some smaller fixes.

## 0.2.4

- Add References to Handler Functions

## 0.2.3

- Create Procedure Code Action
  - If the parameter was a value of an enum, then a Variant-Parameter was created. That's fixed now.

## 0.2.2

- Create Procedure Code Action
  - supports creation of procedure in Test-Methods
  - supports various more statements where procedures could be created and the return type is identified correctly, e.g.:
    - As parameter of another procedure call: The procedure takes the type of the appropriate parameter as return value.
    - If Statement: created procedure returns boolean
    - Assignment statement: created procedure returns the type of the variable which will be assigned
    - Mathematical statements like add, subtract, multiply: created procedure returns Decimal or Integer
    - Logical Statements like "true && notexistingprocedure()" returns boolean
    - ...
  - supports creation of multiline procedures
  - temporary variables will be declared as var-Parameters
- Extract to procedure Code Action
  - Remove "Preferred Fix"-Property as it isn't working and does not make much sense.
  - hand over the return value of a procedure if it is used inside the selection
- Technical rebuild of extension

## 0.2.1

- Improvement to "Create Procedure": Rec and xRec are now recognized in Tables, Pages, Request Pages and Codeunits.
- small bugfix if a dot was included in the variable name

## 0.2.0

- First (beta) version of the "Extract procedure"-function.

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
