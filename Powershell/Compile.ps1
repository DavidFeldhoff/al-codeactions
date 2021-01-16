param(
    $project, 
    $packageCachePath, 
    $pathToErrorLog,
    $alLangVersion, 
    $alCodeActionsVersion, 
    $useLegacyRuntime,
    $codeCop,
    $pteCop,
    $appSourceCop,
    $uiCop,
    $assemblyProbingPathsArr,
    $keepWarnings)

        
$currLocation = Get-Location
# $alLangVersion = 5.0.335750
$pathToVSCodeExtFolder = ''

[string[]]$paths = @()
$paths += [System.Environment]::GetEnvironmentVariable('USERPROFILE')
$paths += '.vscode'
$paths += 'extensions'
foreach ($path in $paths) {
    if ($pathToVSCodeExtFolder -eq '') {
        $pathToVSCodeExtFolder = $path
    }
    else {
        $pathToVSCodeExtFolder = Join-Path -Path $pathToVSCodeExtFolder -ChildPath $path
    }
}
if (!(Test-Path $pathToVSCodeExtFolder)) {
    throw "Unable to find vscode extension folder at $pathToVSCodeExtFolder"
}
$alLangExtFolderName = "ms-dynamics-smb.al-$alLangVersion"
$pathToALLangExtFolder = Join-Path -Path $pathToVSCodeExtFolder -ChildPath $alLangExtFolderName
if (!(Test-Path $pathToALLangExtFolder)) {
    throw "Unable to find vscode extension folder of $alLangExtFolderName at $pathToALLangExtFolder"
}
$binFolder = Join-Path -Path $pathToALLangExtFolder -ChildPath 'bin'
if (!(Test-Path $binFolder)) {
    throw "Unable to find bin folder at $binFolder"
}

$alCodeActionsFolderName = "davidfeldhoff.al-codeactions-$alCodeActionsVersion"
$pathToALCodeActionsExtFolder = Join-Path -Path $pathToVSCodeExtFolder -ChildPath $alCodeActionsFolderName
if (!(Test-Path $pathToALCodeActionsExtFolder)) {
    throw "Unable to find vscode extension folder of $alCodeActionsFolderName at $pathToALCodeActionsExtFolder"
}

Set-Location $binFolder
$pathToAlcExe = ''
if ($useLegacyRuntime) {
    if (!(Test-Path .\alc.exe)) {
        throw "Unable to find alc.exe in $binFolder"
    }
    $pathToAlcExe = '.\alc.exe'
}
else {
    if (!(Test-Path .\win32\alc.exe)) {
        throw "Unable to find alc.exe in " + (Join-Path $binFolder 'win32')
    }
    $pathToAlcExe = '.\win32\alc.exe'
}

$codeCopWarnings = @(
    'AA0001', 'AA0002', 'AA0003', 'AA0005', 'AA0008', 'AA0013', 'AA0018', 'AA0021', 'AA0022', 'AA0040', 'AA0072', 'AA0073', 'AA0074', 'AA0087', 'AA0100', 'AA0101', 'AA0102', 'AA0103', 'AA0104', 'AA0105', 'AA0106', 'AA0131', 'AA0136', 'AA0137', 'AA0139', 'AA0150', 'AA0161', 'AA0175', 'AA0181', 'AA0189', 'AA0194', 'AA0198', 'AA0199', 'AA0200', 'AA0201', 'AA0202', 'AA0203', 'AA0204', 'AA0205', 'AA0206', 'AA0207', 'AA0210', 'AA0211', 'AA0213', 'AA0214', 'AA0215', 'AA0216', 'AA0217', 'AA0218', 'AA0219', 'AA0220', 'AA0221', 'AA0222', 'AA0223', 'AA0224', 'AA0225', 'AA0226', 'AA0227', 'AA0228', 'AA0230', 'AA0231', 'AA0232', 'AA0233', 'AA0235', 'AA0237', 'AA0240', 'AA0241', 'AA0448', 'AA0462', 'AA0470'
)
$alWarnings = @(
    'AL0254', 'AL0269', 'AL0432', 'AL0468', 'AL0482', 'AL0509', 'AL0547', 'AL0561', 'AL0569', 'AL0589', 'AL0603', 'AL0604', 'AL0606', 'AL0667', 'AL0601'
)
[System.Collections.ArrayList]$allWarnings = $codeCopWarnings + $alWarnings
foreach ($keepWarning in $keepWarnings) {
    $allWarnings.Remove($keepWarning)
}

[string]$assemblyProbingPaths = ""
foreach ($item in $assemblyProbingPathsArr) {
    if (Test-Path $item) {
        if ($assemblyProbingPaths -ne "") {
            $assemblyProbingPaths += ","
        }
        $assemblyProbingPaths += "'$item'"
    }
}

$commandString = "$pathToAlcExe /project:'$project' /packageCachePath:'$packageCachePath' /generatereportlayout- /nowarn:'$($allWarnings -join "','")'"
if ($assemblyProbingPaths -ne "") {
    $commandString += " /assemblyprobingpaths:$assemblyProbingPaths"
}
if ($codeCop) {
    $commandString += " /analyzer:'./Analyzers/Microsoft.Dynamics.Nav.CodeCop.dll'"
}
if ($pteCop) {
    $commandString += " /analyzer:'./Analyzers/Microsoft.Dynamics.Nav.PerTenantExtensionCop.dll'"
}
if ($appSourceCop) {
    $commandString += " /analyzer:'./Analyzers/Microsoft.Dynamics.Nav.AppSourceCop.dll'"
}
if ($uiCop) {
    $commandString += " /analyzer:'./Analyzers/Microsoft.Dynamics.Nav.UICop.dll'"
}
$pathToTempErrorLog = Join-Path -Path $pathToALCodeActionsExtFolder -ChildPath 'errorlogtemp.txt'
$commandString += " /errorlog:'$pathToTempErrorLog'"
$buildOutput = (Invoke-Expression $commandString) 2>&1

$json = Get-Content -Path "$pathToTempErrorLog" | ConvertFrom-Json
$errorIssues = $json.issues | Where-Object { $_.properties.severity -eq "error" }
$errorExists = $null -ne $errorIssues
if ($errorExists) {
    Write-Host "Compilation failed. Command stopped. Now printing build output for you to figure out what went wrong.." -ForegroundColor Red
    $buildOutput
    Set-Content -Path "$pathToErrorLog" -Value "failed"
}
else {
    Write-Host "Compilation was successful!" -ForegroundColor Green
    Write-Host "Start executing the function.." -ForegroundColor Yellow

    Set-Content -Path "$pathToErrorLog" -Value (Get-Content -Path "$pathToTempErrorLog")
    Remove-Item -Path "$pathToTempErrorLog"
}
Set-Location $currLocation