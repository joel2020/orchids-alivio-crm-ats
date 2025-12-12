$encoded = 'NDI1ZDczNjAtMTcwZS00MGE3LTkwYmYtZTliYWZlZmNmMDI0OkpGUlBDVndxbnRYQQ=='
$decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encoded))
Write-Host "Decoded API Key: $decoded"

Write-Host "`nTesting campaigns endpoint..."
$response = Invoke-WebRequest -Uri "https://api.instantly.ai/api/v2/campaigns" -Headers @{Authorization = "Bearer $decoded"} -UseBasicParsing
$response.Content
