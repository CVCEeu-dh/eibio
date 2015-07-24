// name: get_suggest
// suggest some results, along with their type..


// name: count_suggest
//
MATCH (n) WHERE n.name =~ {query} RETURN count(*) as total_count

// name: get_suggest
//
MATCH (n) WHERE n.name =~ {query}
RETURN {
  type: last(labels(n)),
  name: n.name,
  slug:n.slug
} as matching
ORDER BY matching.name ASC
SKIP {offset}
LIMIT {limit}


// name: count_fuzzy
//
MATCH (n) WHERE n.name =~ {query} RETURN count(*) as total_count

// name: get_fuzzy
// here a lucene search should be done.
MATCH (n) WHERE n.name =~ {query}
RETURN {
  type:  last(labels(n)),
  name:  n.name,
  props: n,
  slug:  n.slug
} as matching
ORDER BY matching.name ASC
SKIP {offset}
LIMIT {limit}
