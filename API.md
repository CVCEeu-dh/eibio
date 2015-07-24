# Eibio API

A GET only JSON REST api, Eibio API has only some methods available at the moment.
A valid `response`

  ```json
  {
    "status": "ok",
    "result": {},
    "info" : {}
  }
  ```
A not found response is normally sent with 403 HTTP code:
```
{
  "status": "error",
  "error": {
    "code": 404
  }
}
```

| url | type 
| --- | ---
| `/api/institution` | LIST 

For endpoint urls of type LIST, `limit` and `offset` are available as **GET params**, e.g. with [/api/institution?limit=30&offset=10](/api/institution?limit=30&offset=10)
you get the first 30 results skipping the very first 10 results.
Within the info part of the JSON response you get the total_count information about the total amount of possible result for your query.
