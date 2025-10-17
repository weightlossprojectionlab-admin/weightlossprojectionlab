# HTTPS Setup Script for Local Development with Mobile Testing
Write-Host "Setting up HTTPS for local development..." -ForegroundColor Green

# Install local CA
Write-Host "Installing local Certificate Authority..." -ForegroundColor Cyan
mkcert -install
Write-Host "CA installed successfully" -ForegroundColor Green

# Create certs directory
if (-not (Test-Path "certs")) {
    New-Item -ItemType Directory -Path "certs" | Out-Null
    Write-Host "Created certs directory" -ForegroundColor Green
}

# Get local IP
$localIP = "192.168.1.159"
Write-Host "Using local IP: $localIP" -ForegroundColor Green

# Generate certificates
Write-Host "Generating SSL certificates..." -ForegroundColor Cyan
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 $localIP
Write-Host "Certificates generated successfully" -ForegroundColor Green

# Update .gitignore
if (Test-Path ".gitignore") {
    $content = Get-Content ".gitignore" -Raw
    if ($content -notmatch "certs/") {
        Add-Content ".gitignore" "`n# SSL certificates`ncerts/"
        Write-Host "Added certs/ to .gitignore" -ForegroundColor Green
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "HTTPS Setup Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "`nAccess your app at:" -ForegroundColor White
Write-Host "  https://localhost:3000" -ForegroundColor Yellow
Write-Host "  https://$localIP:3000 (for mobile)" -ForegroundColor Yellow
Write-Host "`nStart HTTPS dev server: npm run dev:https" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
