foreach ($ScriptFile in (Get-ChildItem $PSScriptRoot -Filter '*.ps1')) {
    .($ScriptFile.FullName)
}