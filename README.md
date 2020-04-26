# AL CodeActions

This extension provides code actions to the diagnostics reported by the AL Language extension.

## Features

### Create Procedure

Currently there are code actions for the diagnostics AL0118 and AL0132 which are shown when there is no definition for a word in a specific file.  
Of course the code action only shows up if the object with the missing definition is inside the current workspace, so that you are able to edit the file and create the procedure.  

See here how it works:  
![demo](images/createprocedures.gif)

### Extract Procedure

*"Source Code refactoring can improve the quality and maintainability of your project by restructuring your code while not modifying the runtime behavior"* **- VSCode Docs.**  
Well, I tried to add this feature to the AL Language. It's definitely not perfect yet, but I think it's good enough to share with you and get some early feedback (hopefully).  
So, what is possible?  
You can select some code and extract it to a new procedure. It checks which local variables and parameters are needed inside the selected text and hand them over as parameter or add them as local variables. For the moment the parameters are always var-Parameters, but I'm working on improving it to check if the "var" is necessary.  
Furthermore you have to wait a little bit before you can rename the new procedure while the body of the newly created procedure is formatted. Unfortunately it jumps a little bit, but don't be afraid, it's just a formatting ;) (you can see it in th gifs). On that I'm working to improve as well, but again, I think it's a good first step to share. Please feel free to test this one and I appreciate any feedback! Your feedback will always help me prioritizing :)
And I have to admit that this feature is currently not working with report dataitems because I don't recognize them as parameters yet.  
Before showing this feature in action I would like to thank Andrzej (again) for his support.

![demo](images/ExtractRepeat.gif)
![demo](images/ExtractIf.gif)

## Requirements

|              |         |
|--------------|---------|
| AL Language               | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/ms-dynamics-smb.al.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) |
| AZ AL Dev Tools/AL Code Outline           | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/andrzejzwierzchowski.al-code-outline.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=andrzejzwierzchowski.al-code-outline) |

## Known Issues

- See github issues

## Thanks to

- Andrzej Zwierzchowski for your detailed explanations and helping me get started.

## About me

I started developing Dynamics NAV in 2014, but I always had an eye on other languages like Java or C# and was inspired by their development environment.  
Currently I work as a product developer at GWS mbH in Germany on the newest BC versions and thanks to the extensibility of VS Code it was quite obvious to me to help to improve the development environment of AL and give something small back to the awesome BC-Community. Feel free to contribute to the extension development or join us at [GWS mbH](https://www.gws.ms/en) to create some amazing BC-Apps.
