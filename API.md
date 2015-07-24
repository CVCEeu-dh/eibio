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

| url | result type | what for
| --- | ---  | --- |
| `/api/person` | [] | return a list of persons
| `/api/person/:slug([\da-z-]+)` | {} | return details about a specific person
| `/api/person/:slug([\da-z-]+)/related/person` | [] | return a list of COLLEAGUES related to a specific person
| `/api/activity` | [] | return a list of activities
| `/api/activity/:slug([\da-z-]+)` | {} | return details about a specific activity
| `/api/activity/:slug([\da-z-]+)/related/person` | [] | return a list of persons related to a specific position
| `/api/institution` | [] | return a list of institution
| `/api/institution/:slug([\da-z-]+)` | {} | return details about a specific institution
| `/api/institution/:slug([\da-z-]+)/related/person` | [] | return a list of persons related to a specific institution

For endpoint urls of type LIST [], `limit` and `offset` are available as **GET params**, e.g. with [/api/institution?limit=30&offset=10](/api/institution?limit=30&offset=10)
you get the first 30 results skipping the very first 10 results.
Within the info part of the JSON response you get the total_count information about the total amount of possible result for your query.
