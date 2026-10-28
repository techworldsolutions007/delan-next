# test-webhook.ps1
# Usage: Run `npm run dev` first, then in a new terminal: .\test-webhook.ps1
# Tests that the /api/revalidate endpoint correctly verifies Shopify HMAC signatures.

param(
  [string]$Port = "3000",
  [string]$Topic = "products/update"
)

# Load secret from .env.local
$envPath = Join-Path $PSScriptRoot ".env.local"
$secret = $null
foreach ($line in Get-Content $envPath) {
  if ($line -match '^SHOPIFY_WEBHOOK_SECRET=(.+)$') {
    $secret = $matches[1].Trim()
    break
  }
}
if (-not $secret) { Write-Error "SHOPIFY_WEBHOOK_SECRET not found in .env.local"; exit 1 }

# Mock payload matching what Shopify sends
$payload = @{
  id     = 1234567890
  title  = "Test Product"
  handle = "test-product"
  status = "active"
} | ConvertTo-Json -Compress

# Compute HMAC-SHA256 signature (base64) — matches what Shopify sends
$keyBytes  = [System.Text.Encoding]::UTF8.GetBytes($secret)
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
$hmac      = [System.Security.Cryptography.HMACSHA256]::new($keyBytes)
$sig       = [Convert]::ToBase64String($hmac.ComputeHash($bodyBytes))

$url = "http://localhost:$Port/api/revalidate"

Write-Host ""
Write-Host "Testing: $url" -ForegroundColor Cyan
Write-Host "Topic:   $Topic" -ForegroundColor Cyan
Write-Host "HMAC:    $sig" -ForegroundColor DarkGray
Write-Host ""

try {
  $response = Invoke-RestMethod `
    -Uri $url `
    -Method POST `
    -Body $payload `
    -ContentType "application/json" `
    -Headers @{
      "x-shopify-topic"      = $Topic
      "x-shopify-hmac-sha256" = $sig
    }

  Write-Host "PASS — endpoint returned:" -ForegroundColor Green
  $response | ConvertTo-Json
} catch {
  $status = $_.Exception.Response?.StatusCode.value__
  Write-Host "FAIL — HTTP $status" -ForegroundColor Red
  Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "--- Testing with BAD signature (should get 401) ---" -ForegroundColor Yellow
try {
  Invoke-RestMethod `
    -Uri $url `
    -Method POST `
    -Body $payload `
    -ContentType "application/json" `
    -Headers @{
      "x-shopify-topic"      = $Topic
      "x-shopify-hmac-sha256" = "invalidsignature=="
    }
  Write-Host "FAIL — expected 401 but got 200!" -ForegroundColor Red
} catch {
  $status = $_.Exception.Response?.StatusCode.value__
  if ($status -eq 401) {
    Write-Host "PASS — correctly rejected bad signature (401)" -ForegroundColor Green
  } else {
    Write-Host "FAIL — unexpected status $status" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message
  }
}
Write-Host ""
