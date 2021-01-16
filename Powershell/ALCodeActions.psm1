foreach ($ScriptFile in (Get-ChildItem $PSScriptRoot -Filter '*.ps1')) {
    if ($ScriptFile.Name -ne "Compile.ps1") {
        .($ScriptFile.FullName)
    }
}