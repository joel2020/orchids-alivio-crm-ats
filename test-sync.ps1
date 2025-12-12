$body = @{
    connection_id = "b5225d6e-7b19-44e8-b71d-f9206b2fd0fa"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/instantly/sync" -Method Post -Body $body -ContentType "application/json"

$response | ConvertTo-Json -Depth 10
