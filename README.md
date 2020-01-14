# AL CodeActions

[![Build Status](https://dev.azure.com/davidfeldhoff/Community/_apis/build/status/DavidFeldhoff.al-codeactions?branchName=master)](https://dev.azure.com/davidfeldhoff/Community/_build/latest?definitionId=2&branchName=master)  
This extension provides code actions to the diagnostics reported by the AL Language extension.

## Features

Currently there are code actions for the diagnostics AL0118 and AL0132 which are shown when there is no definition for a word in a specific file.  
Of course the code action only shows up if the object with the missing definition is inside the current workspace, so that you are able to edit the file and create the procedure.  

See here how it works:  
![demo](images/createprocedures.gif)

## Requirements

|              |         |
|--------------|---------|
| AL Language               | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/ms-dynamics-smb.al.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) |
| AZ AL Dev Tools/AL Code Outline           | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/andrzejzwierzchowski.al-code-outline.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=andrzejzwierzchowski.al-code-outline) |

## Known Issues

- If you create a procedure using the code action in another app by using multi-root workspaces won't fix the error which is reported by the code analyzer.
- To create a procedure with another procedure as parameter will create a procedure with a variant parameter.
- To create a procedure where the return value is directly used (for example in an if-statement or as procedure parameter) is not supported yet.

## Thanks to

- Andrzej Zwierzchowski for your detailed explanations and helping me get started.

## About me

I started developing Dynamics NAV in 2014, but I always had an eye on other languages like Java or C# and was inspired by their development environment.  
Currently I work as a product developer at GWS mbH in Germany on the newest BC versions and thanks to the extensibility of VS Code it was quite obvious to me to help to improve the development environment of AL and give something small back to the awesome BC-Community. Feel free to contribute to the extension development or join us at [GWS mbH](https://www.gws.ms/en) to create some amazing BC-Apps.
