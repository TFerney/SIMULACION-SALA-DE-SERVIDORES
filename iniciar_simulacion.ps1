# Gemelo Digital 3D - UDES
Set-Location $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  GEMELO DIGITAL 3D - CENTRO DE DATOS & CFD        " -ForegroundColor Cyan
Write-Host "  Universidad de Santander (UDES)                  " -ForegroundColor Cyan
Write-Host "  Iniciando servidor en http://localhost:8000/ ... " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

Start-Process "http://localhost:8000"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8000/')
$listener.Start()

Write-Host "Servidor HTTP activo. Presiona Ctrl+C para detener.`n" -ForegroundColor Yellow

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    
    $urlPath = $req.RawUrl.Split('?')[0]
    if ($urlPath -eq '/' -or $urlPath -eq '') {
        $urlPath = '/index.html'
    }
    
    $localPath = Join-Path $PSScriptRoot $urlPath.TrimStart('/')
    
    if (Test-Path $localPath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($localPath)
        $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
        
        switch ($ext) {
            '.html' { $res.ContentType = 'text/html; charset=utf-8' }
            '.js'   { $res.ContentType = 'application/javascript; charset=utf-8' }
            '.css'  { $res.ContentType = 'text/css; charset=utf-8' }
            '.json' { $res.ContentType = 'application/json' }
            default { $res.ContentType = 'application/octet-stream' }
        }
        
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
    }
    $res.OutputStream.Close()
}
