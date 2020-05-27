# Change Log

All notable changes to the "al-codeactions" extension will be documented in this file.

## 0.2.10

- fixed bug which won't led you create procedures.
- Procedures are now placed before the global var section if there is no procedure in the file yet.

## 0.2.9

- Extract Procedure
  - Now also supports variables which are declared in one line (new in BC16).
- Create IntegrationEvent/BusinessEvent Publisher
  - If the procedure starts with "On.." you can choose to create a publisher for an integration or a business event instead. If you create that one, the cursor won't jump to the position, because you can't insert code to that publisher anyway. Furthermore, the Business/Integration Event Publisher is inserted in the correct order in the file (if a structure exists already - see the "Sort Procedures" Command of the AZ AL Dev Tools for that ;) )

## 0.2.8

- Extract Procedure
  - Fixed performance issue. It's now quite fast again.
  - Bugfix: Sometimes there was a semicolon missing after the new procedure was extracted.
- Create Handlerfunction:
  - The name of the Handlerfunction to create is now also displayed. This is helpful if multiple handler functions are missing.
- General: The position of the procedure to insert is improved:
  - The local/global procedures or handler functions are now in a fixed order which comply with the order of the "Sort procedures" Code action of the AZ AL Dev Tools/AL Code Outline Extension.

## 0.2.7

- Create Procedure
  - Fix direct usage of an enum: Type is now identified correctly.

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
