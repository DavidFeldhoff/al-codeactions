# Change Log

All notable changes to the "al-codeactions" extension will be documented in this file.

## 1.0.3

- Minor changes
  - Create procedure in argument list even if the procedure does not exist yet
  - Create Procedure in Validate Statement
  - Create overload of procedure: fix if the new parameter is a text variable
  - Remove unused variables: Show locations of unused parameters which were not removed to be able to fix them manually.

## 1.0.2

- Add feature "Add parameter": If there is an existing procedure with one parameter, but you call that with multiple, you can add these additional variables as parameter [Demo](README.md#add-parameters)
- Add feature "Create overload": If there is an existing procedure with one parameter, but you call that with multiple, you can create an overload and optionally obsolete the old procedure. [Demo](README.md#create-overload)

## 1.0.1

- small bugfix: Integration Events were not placed correctly in the document

## 1.0.0

- Add feature "Find related" in the context menu of onInsert/Modify/Delete/Validate triggers: #86, #94
  - Find related calls (with RunTrigger=true only or all calls)
  - Find related event subscribers like OnAfterInsertEvent
  - Find related triggers of table extensions like OnAfterInsert-Trigger
  - Note: Supports AL Studio and AL Object Designer and uses the data of their research to avoid duplicate processing of files.
- Add feature "Fix Cop AA0008 Missing Parentheses" #110
- Add configuration ("findNewProcedureLocation"), so that you can customize where you'd like to have your new procedure placed.
- Add configuration ("varParameters"). The parameter names of a newly created procedure will be checked against this list and declared as var-parameter on match #63, #69
- Add configuration ("publisherHasVarParametersOnly"). If this is set, then new publishers will be declared with var-parameters only. #63
- Add a completionItemProvider like AL Variable Helper for parameters, Interfaces, and TestRequestPages while waiting for a fix of AL Variable Helper.
- small bugfixes/improvements
  - #109 - thanks Tin
  - RefactorToValidate threw errors in the background (not critical, but unnecessary)
  - HandlerFunctions which were created were missing var-parameters
  - Improve "Move local var to global one" as the global variable is in the right place
  - Range is now revealed if the procedure was created, so you directly see the newly created procedure.

## 0.2.29

- Support the feature of v0.2.28 for procedures which should be created in other documents as well.

## 0.2.28

- Ask for return value if a procedure needs definitely one. [#76](https://github.com/DavidFeldhoff/al-codeactions/issues/76)

## 0.2.27

- Fix bug: this.memberAttributes is not iterable
  - Thanks to Waldemar for opening this quick issue.

## 0.2.26

- New code action: "Make variable global"
- Support Jsonc format for AppSourceCop.json (Json with comments)

## 0.2.25

- Improve "Fix Cop Warnings"-Command
  - Remove unsafe mode of FixAA0206
  - Give more information what's currently happening (progressbars and so on)
  - Improve the removal of unnecessary assignments of variables, so that all are removed at once.

## 0.2.24

- Improve "Fix Cop Warnings"-Command

## 0.2.23

- Remove command: Fix implicit with usage as [Andrzej](https://marketplace.visualstudio.com/items?itemName=andrzejzwierzchowski.al-code-outline) has a better implementation of that command.

## 0.2.22

- Extract procedure:
  - fixed if one-liner[#97](https://github.com/DavidFeldhoff/al-codeactions/issues/97)
  - Create Event Publishers in other documents than the current one. [#99](https://github.com/DavidFeldhoff/al-codeactions/issues/99)
- New functionality: Fix Cop Warnings
  - Remove assigned, but unused variables (safe and unsafe mode)
  - Remove unused variables

## 0.2.21

- New functionality: Definition Provider to event subscribers. This one is deactivated if AL Studio is installed as well as this extension provides the same functionality.
- Extract procedure: Bug fixed if local variables were moved to the new procedure then the renaming failed.

## 0.2.20

- Create procedure:  
  - Small bugfix in test-codeunits if there's a OnRun trigger then the created procedure was inserted before the Test-Methods
  - Parameters like Database::Item or Page::"Customer Card" are now recognized as ObjectID parameter instead as Variant
  - Add procedures to Interface
  - Add procedures to subpages (Currpage.Lines.Page.NewMethod)
- Extract procedure: remove local variables afterwards
- New functionality: Refactor to Validate

## 0.2.19

- Extract to label: Small bugfix if there was no local variable-section yet

## 0.2.18

- New functionality: Extract to label
- Made functionality obsolete: 'Add pragmas' as this one is possible with the feature flag NoImplicitWith in the app.json. https://docs.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-deprecating-with-statements-overview#al0604---use-of-implicit-with

## 0.2.17

- References to Built in functions
  - Make dependency to AL Object Designer to a soft dependency. So if this extension isn't installed, then the eventsubscriptions and tableextension triggers aren't found.

## 0.2.16

- New functionality: References to Built in functions
  - Add a definition provider which shows all functions which get triggered on onInsert/onModify/onValidate and so on.
- Create Procedure
  - Detect "Enum::MyEnum::Value" as "MyEnum"-parameter

## 0.2.15

- Command added: Fix implicit with-usages
  - fixes all warnings displayed in the problems pane. If there are more than 100 warnings inside a file, the command has to be executed again at a later time.
- Command added: Add pragma 'implicit with disable' to all files.

## 0.2.14

- Extract Procedure
  - Improve Extraction. It's now possible to extract only parts of a statement while the recognition of the return type stays intact.
  - Small bug fixes.
- Create Procedure
  - When used directly in an exit statement the return variable is identified correctly: Exit(MyNewProcedure())
  - German special characters aren't deleted from the variable name (e.g. Länge)
- Create Publishers
  - You can have in front of your publisher function which should be created a prefix, so that ABC_OnDoSomething is valid as well. The prefix is looked up in the AppSourceCop.json

## 0.2.13

- Create Procedure Positioning: Align the best practice of the al file structure, so that newly created procedures are now placed behind the global var section if there's no other anchor (like another local/global/test-procedure).

## 0.2.12

- Disabled the new command "Remove all With-Usages" again. I'm working on a better solution for that.

## 0.2.11

- New Command: Remove all With-Usages (more info in the readme)
- Improve the position of the cursor if a procedure was created. The cursor is now placed directly in front of the first body line.

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
