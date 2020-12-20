function Write-Status {
    param (
        $firstLine,
        $secondLine
    )
    Write-Host ""
    Write-Host $firstLine -ForegroundColor Green
    Write-Host $secondLine -ForegroundColor Yellow
}

Export-ModuleMember -Function Write-Status