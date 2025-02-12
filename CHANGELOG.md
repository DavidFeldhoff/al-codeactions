# Change Log

All notable changes to the "al-codeactions" extension will be documented in this file.

## 1.0.37

- New functionality: `Refactor to Evaluate`
- fix "Create Procedure" inserts into the wrong object when `Table1.ExistingFunction(Table2).NotExistingFunction();` and `Existingfunction` would have returned Table1 again. #183
- New functionality: `Create procedure as TryFunction` if the procedure name starts with `Try..` #181

## 1.0.36

- `Extract Label` now also supported outside of methods like e.g. in page field or report column source expressions #178.
- `Promote action` did not add quotes to existing action groups. #168
- `Create Method` with a Label as parameter results now in expecting a Text-parameter and it removes the known Suffixes (Msg, Tok, Err, Qst, Lbl, Txt) from the variable name. #179

## 1.0.35

- respect the code action provider context to find out if a code action is currently requested because of an OnSave action (which means that the code action providers of AL CodeAction don't have to be executed) or if it is executed explicitly. Furthermore a new setting `alCodeActions.executeCodeActionsAutomatically` is introduced which allows to only provide codeactions on explicit request by using the `Ctrl + .` keybinding or `Quick Fix...` command to reduce the needed CPU for AL CodeActions, but still having the functionality in place.

## 1.0.34

- comply with AZ AL Dev Tools/AL Code Outline v3.0.56. Many functionalities were broken.

## 1.0.33

- files.eol setting has new default option "auto" instead of \r or \r\n, so it had to be considered.

## 1.0.32

- When working with LF linebreaks, there was an issue with `Extract Label` as the rename was executed at a wrong place. #165

## 1.0.31

- Add OnBefore/OnAfter publisher was quite often unavailable #166

## 1.0.30

- Change the UX of "Create/Extract procedure with advanced options", so that you now select which option you want to activate instead of having multiple questions which you had to answer with Yes and No
- Adding publishers to a newly created procedure sometimes added the publishers to the wrong procedure
- Extract procedure now also extracts comments if they were selected.
- Fix Create Procedure added "internal" even if the caller was in a different app #162
- Try to detect better if a LF only should be used (instead of CRLF) #160
- Convert option to enum appeared twice in table fields
- Be compatible with latest AZ AL Dev Tools again and fix #164, #163

## 1.0.29

- Fix "Extract single line to procedure does not ask for new procedure name" #155

## 1.0.28

- Promote action was only supported for pages, now it's also working for page extensions. #156

## 1.0.27

- comply with AL Language version 11.* (temporary keyword was added twice if used in a procedure)

## 1.0.26

- fix for multiple `Extract to Label`: If multiple labels have been selected and the global variable was at the bottom of the file, the `rename` was executed at a wrong position. Related to #149

## 1.0.25

- Enhancement to Extract to label: If there are further occurences of the same string literal, then you're asked if you want to replace these as well. #149
- Convert Option to enum now also working for option variables. Earlier it was only possible for tablefields of type option
- Promote an action as actionref. #151
- Minor change: Extract procedure with the advanced creation: Ask for the procedure name at the latest possible moment (not in between)

## 1.0.24

- Do not sanitize parameter names in onBefore publishers. #146

## 1.0.23

- Trying to fix #145 where nothing was working because of an error `Cannot read properties of undefined (reading 'trackEvent')`
- Improve "Find Related"-menus, so that it is now in its own view container and that its now able to start searching from a table directly.

## 1.0.22

- Add `IsHandled := false` before OnBeforePublishers only if the new setting is activated: `alCodeActions.initializeIsHandledVariableWhenCreatingOnBeforePublisher` 

## 1.0.21

- Use webpack to increase performance #141
- Add "Extract to locked Label"
- Add "Create .. with advanced options" code actions with that a few more options are available like adding publishers directly to that procedure or placing the procedure at a specific place. That's also the reason why the property "alCodeActions.findNewProcedureLocation": "Always ask" was removed.
- Improve working with regions #144


## 1.0.20

- Fix creating of procedures #143

## 1.0.19

- Add IsHandled := false to OnBeforePublishers
- Categorize code actions to match better with the new VS Code Code Action control https://code.visualstudio.com/updates/v1_71#_new-code-action-control
- Consider regions in the selection if setting "alCodeActions.findNewProcedureLocation": "Always ask" is activated

## 1.0.18

- Extract to Label: Add record type in default values which have been introduced in 1.0.15 #138
- fix return type in constructs like "Hello" + "World" + MissingFunc(); as previously the return type was considered as decimal

## 1.0.17

- reduce amount of app insight logs

## 1.0.16

- small fix for #138

## 1.0.15

- Add Application Insights
- Extract to Label: Add default values for placeholders if alCodeActions.extractToLabelCreatesComment is set #138

## 1.0.14

- Be able to create procedures in report extension objects.

## 1.0.13

- #133: fix "Illegal value for line" error

## 1.0.12

- #133: "Create Overload" or "Add parameters": Allow comment lines before that line

## 1.0.11

- #133: Second try of being compatible with AL Language Extension version 8.2.545335

## 1.0.10

- #132: Be compatible with AL Language Extension version 8.2.545335
- #131: Allow leading and trailing spaces in the selection while extracting a procedure

## 1.0.9

- #122: Convert option to enum on table field: Small addition that if one caption is blank (' '), then ", Locked = true" is added

## 1.0.8

- fix #128: Extract procedure should allow rename even if a comment is inside the selection
- fix #126: Position of new procedures: If the "anchor" after which the new procedure should be added is a trigger, then the new procedure should be added after the last global variable section - not the first one
- Add configuration "Extract to Label Creates Comment": This will add a Comment section with the used placeholders to explain them.
- OnBefore/OnAfter Publisher parameters: Add Rec and xRec as candidates where possible. #127

## 1.0.7

- Add feature "Refactor Option to Enum"
- Improve: Add Parameters/Create Procedure overload. If a string literal was handed over, it just checked if there are procedure candidates with a 'Text' parameter. Procedures with equivalent parameters like 'Code' have not been considered. This has been improved.
- Improve: Setting "Location of new procedure = Always ask". Now the current procedure from which the new procedure should be created is listed at the top of the list, so that we can simply "enter" the list away if we want to create the procedure directly underneath.
- Bugfix: Setting "Location of new procedure = Always ask". While going through the procedure candidates under which we want to place our new procedure, the editor revealed the procedure content in the current editor. But if we wanted to create the procedure in a different document, then the wrong content was revealed. This has been fixed.

## 1.0.6

- Bugfix: If a procedure should be added at the end of the file, an error appeared

## 1.0.5

- Add feature "Add OnBefore Publisher" and "Add OnAfter Publisher"

## 1.0.4

- Create overload respects return variables. #118, #119

## 1.0.3

- Minor changes
  - Create procedure in argument list even if the procedure does not exist yet
  - Create procedure in Validate Statement
  - Create overload of procedure: fix if the new parameter is a text variable
  - Create overload of procedure/Add parameters: fix if the original procedure had no parameters.
  - Create procedure: Add procedure on source table if you're on a page #66
  - Remove unused variables (Fix Cop-Command): Show locations of unused parameters which were not removed to be able to fix them manually.
  - Find related Insert-Calls: If the record to search for was a parameter, then there was a chance it was identified false positive which is fixed now.

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
