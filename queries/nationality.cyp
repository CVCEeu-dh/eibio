// name: merge_nationality
//
MERGE (nat:nationality {slug: {slug}})
  ON CREATE SET
    nat.country = {country}
WITH nat
MATCH (per:person {slug:{person_slug}})
MERGE (per)-[r:has_nationality]->(nat)
  ON CREATE SET
    r.caption = {caption}
    {if:start_date}
      r.start_date = {start_date},
      r.start_time = {start_time},
    {/if}
    {if:end_date}
      r.end_date   = {end_date},
      r.end_time   = {end_time}
    {/if}
  ON MATCH SET
    r.caption = {caption}
    {if:start_date}
      r.start_date = {start_date},
      r.start_time = {start_time},
    {/if}
    {if:end_date}
      r.end_date   = {end_date},
      r.end_time   = {end_time}
    {/if}
RETURN {
  id: id(nat),
  props: nat,
  rels: r
} as nationality


// name: remove_nationality
// delete a nationality and its links
MATCH (nat:nationality {slug: {slug}})
OPTIONAL MATCH (nat)-[r]-()
DELETE nat, r