# AL CodeActions

## Features

|Feature  |Description  |
|---------|---------|
|**Create Procedure / Publisher / HandlerFunction**     | There are code actions to create a missing procedure inside the same object or even of another object. The return type is identified in most cases directly if it's used as a parameter of another procedure call as example. If the procedure name starts with 'On', then you can also create an Integration Event instead (AppSourceCopPrefix could be placed before that 'On'). Furthermore it's possible to create missing handler functions. See how it works at the end of this file.        |
|**Extract Procedure**     |Select some code and extract it to a new procedure. It checks which local variables and parameters are needed inside the selected text and hands them over as parameter or adds them as local variables. For the moment the parameters are always var-Parameters, but I'm considering to improve it to check if the "var" is necessary. After the new procedure is created you can rename it directly. And I have to admit that this feature is currently not working with report dataitems because I don't recognize them as parameters yet. Before showing this feature in action at the end of this file I would like to thank Andrzej for his support (again). |
|**References to HandlerFunctions**     | The AL language does not provide references or definitions for handler functions yet which is why you can't jump between these with F12 or Shift+F12. This extension fixed it to improve your daily test writing.        |
|**References to Built in functions**|If you want to know what gets triggered if you call Customer.Insert() then this feature will not only show you the OnInsert-Trigger of the base table, but also all OnBefore-/OnAfterInsert Event Subscribers and all OnBefore-/OnAfter-/OnInsert-Triggers of the TableExtensions you developed.|
|**Fix implicit with-usages**     | This command uses the AL0604 warnings reported by the AL Language Extension and qualifies them with a "Rec.". If a file contains more than 100 warnings then not all usages are reported by the AL Language extension. In these cases, please execute the command a second time after the warnings are recalculated (reload window?). <br>After all implicit with usages are qualified once, I suggest to execute the command **"Add Pragma 'implicit with disable' to all files"** of this extension (you can use pragmas if your runtime is >=6.0). This adds the pragma to all pages, pageextensions, table, tableextensions, codeunits and request pages. |

## Requirements

|              |         |
|--------------|---------|
| AL Language               | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/ms-dynamics-smb.al.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) |
| AZ AL Dev Tools/AL Code Outline           | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/andrzejzwierzchowski.al-code-outline.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=andrzejzwierzchowski.al-code-outline) |

## Known Issues

- See github issues

## Thanks to

- Andrzej Zwierzchowski for your detailed explanations and helping me get started.

## Demo

### Demo Create Procedure

![demo Create Procedure](images/createprocedures.gif)

### Demo Create Handler Function

![demo Handler Functions](images/CreateHandlerFunctions.gif)

## Demo Create Publisher Events

![demo Publisher Events](images/CreateIntegrationEvents.gif)

### Demo Extract Procedure

![demo](images/ExtractRepeat.gif)  

![demo](images/ExtractIf.gif)

### Demo References to HandlerFunctions

![demo](images/HandlerFunctionReferences.gif)

## About me

I started developing Dynamics NAV in 2014, but I always had an eye on other languages like Java or C# and was inspired by their development environment.  
Currently I work as a product developer at GWS mbH in Germany on the newest BC versions and thanks to the extensibility of VS Code it was quite obvious to me to help to improve the development environment of AL and give something small back to the awesome BC-Community. Feel free to contribute to the extension development or join us at [GWS mbH](https://www.gws.ms/en) to create some amazing BC-Apps.
