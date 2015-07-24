// name: get_institutions
// get institutions
MATCH(ins:institution)
RETURN {
  slug: ins.slug,
  uri:  'institution/' + ins.slug,
  props: ins,
  type:  last(labels(ins))
}
SKIP {offset}
LIMIT {limit}


// name: get_institution
// get single institution
MATCH(ins:institution {slug: {slug}})
RETURN {
  slug: ins.slug,
  props:ins,
  type: last(labels(ins))
}


// name: count_institution_related_persons
//
MATCH (ins:institution {slug:{slug}})-[:appears_in]->(act:activity)<-[:employed_as]-(per:person)
RETURN count(DISTINCT(per)) as total_count


// name: get_institution_related_persons
//
MATCH (ins:institution {slug:{slug}})-[:appears_in]->(act:activity)<-[r:employed_as]-(per:person)
WITH DISTINCT per, r, act
RETURN {
  slug: per.slug,
  uri: 'person/' + per.slug,
  props: per,
  activities: collect(act),
  rels:       collect(r),
  start_time: max(r.start_time)
} as person
ORDER BY person.start_time DESC
SKIP {offset}
LIMIT {limit}


// name: merge_institution
//
MERGE (ins:institution {slug: {slug}})
  ON CREATE SET
    ins.name           = {name},
    {if:name_fr}
      ins.name_fr      = {name_fr},
    {/if}
    {if:name_en}
      ins.name_en      = {name_en},
    {/if}
    {if:abstract_fr}
      ins.abstract_fr  = {abstract_fr},
    {/if}
    {if:abstract_en}
      ins.abstract_en  = {abstract_en},
    {/if}
    {if:address}
      ins.address      = {address},
    {/if}
    {if:url}
      ins.url          = {url},
    {/if}
    {if:wiki_id}
      ins.wiki_id      = {wiki_id},
    {/if}
    {if:country}
      ins.country      = {country},
    {/if}
    ins.creation_date  = {creation_date},
    ins.creation_time  = {creation_time}
RETURN {
  uri: 'institution/'+ins.slug,
  slug:  ins.slug,
  props: ins,
  type:  last(labels(ins))
} as institution

// name: merge_institution_activity_relationship
//
MATCH (ins:institution {slug: {slug}}), (act:activity {slug:{activity_slug}})
MERGE (ins)-[r:appears_in]->(act)
RETURN {
  id: id(ins),
  props: ins,
  type: last(labels(ins))
} as institution


// name: remove_institution
// delete an institution and its links
MATCH (ins:institution {slug: {slug}})
OPTIONAL MATCH (ins)-[r]-()
DELETE ins, r