// name: count_regexp_suggest
//
MATCH (n) WHERE n.name =~ {query} RETURN count(*) as total_count

// name: get_regexp_suggest
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


// name: count_suggest
// by type
START n=node:node_auto_index({query})
RETURN count(n) as total_count

// name: get_suggest
// here a lucene search should be done.
START n=node:node_auto_index({query})
RETURN {
  type:  last(labels(n)),
  name:  n.name,
  props: n,
  slug:  n.slug
} as matching
SKIP {offset}
LIMIT {limit}
