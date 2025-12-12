$body = @{
  connection_id = 'b5225d6e-7b19-44e8-b71d-f9206b2fd0fa'
  limit = 5
} | ConvertTo-Json

curl.exe -X POST http://localhost:3000/api/instantly/leads -H 'Content-Type: application/json' -d $body
