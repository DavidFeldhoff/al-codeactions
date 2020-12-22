function Start-Compilation {
    param (
        [Parameter(Mandatory = $true)]
        $project,

        [Parameter(Mandatory = $true)]
        $packageCachePath,
    
        [Parameter(Mandatory = $true)]
        [string]
        $pathToErrorLog,
    
        [Parameter(Mandatory = $true)]
        [string] 
        $alLangVersion,
    
        [Parameter(Mandatory = $true)]
        [string] 
        $alCodeActionsVersion,
    
        [switch] 
        $useLegacyRuntime,
    
        [switch]
        $codeCop,
    
        [switch]
        $pteCop,
    
        [switch]
        $appSourceCop,
    
        [switch]
        $uiCop,

        [Parameter(Mandatory = $false)]
        [string[]]
        $assemblyProbingPathsArr = @(),
    
        [Parameter(Mandatory = $false)]
        [string[]]
        $keepWarnings = @()    
    )
    $j = Start-Job `
        -FilePath (Join-Path $PSScriptRoot "Compile.ps1") `
        -ArgumentList @($project, $packageCachePath, $pathToErrorLog, $alLangVersion, $alCodeActionsVersion, $useLegacyRuntime, $codeCop, $pteCop, $appSourceCop, $uiCop, $assemblyProbingPathsArr, $keepWarnings)
    $text = ""
    while ($j.State -eq "Running") {
        Write-Progress -Activity "Compile Solution" -Status "Compiling $text"
        $text = "$text."
        if ($text -eq ".....") { $text = "" }
        Start-Sleep 3
        Receive-Job $j
    }
    Write-Progress -Activity "Compile Solution" -Status "Compiled" -Completed
}

Export-ModuleMember -Function Start-Compilation